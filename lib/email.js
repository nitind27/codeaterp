import nodemailer from 'nodemailer';
import pool from './db.js';

let transporter = null;

// Initialize email transporter
export function initEmailTransporter() {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || ''
    }
  });
}

// Get email settings from database
export async function getEmailSettings() {
  const [settings] = await pool.execute(
    `SELECT setting_key, setting_value FROM system_settings 
     WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_email')`
  );

  const config = {};
  settings.forEach(setting => {
    config[setting.setting_key] = setting.setting_value;
  });

  return config;
}

// Send email
export async function sendEmail(to, subject, html, text = '') {
  try {
    if (!transporter) {
      initEmailTransporter();
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@codeat.com';

    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Queue email for later sending
export async function queueEmail(to, subject, body, scheduledAt = null) {
  try {
    await pool.execute(
      `INSERT INTO email_queue (to_email, subject, body, scheduled_at) 
       VALUES (?, ?, ?, ?)`,
      [to, subject, body, scheduledAt || new Date()]
    );
    return { success: true };
  } catch (error) {
    console.error('Email queue error:', error);
    return { success: false, error: error.message };
  }
}

// Send birthday reminder email
export async function sendBirthdayReminder(employee, daysUntilBirthday) {
  const subject = `Upcoming Birthday Reminder - ${employee.first_name} ${employee.last_name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00b3c6;">Birthday Reminder</h2>
      <p>Hello Team,</p>
      <p>This is a reminder that <strong>${employee.first_name} ${employee.last_name}</strong> 
      (${employee.employee_id}) will be celebrating their birthday in ${daysUntilBirthday} day(s).</p>
      <p>Birthday Date: ${new Date(employee.date_of_birth).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      })}</p>
      <p>Let's make it special!</p>
      <p>Best regards,<br>Codeat Infotech ERP System</p>
    </div>
  `;

  // Get all HR and admin emails
  const [users] = await pool.execute(
    `SELECT email FROM users WHERE role IN ('admin', 'hr') AND is_active = TRUE`
  );

  const emails = users.map(u => u.email);
  for (const email of emails) {
    await queueEmail(email, subject, html);
  }

  return { success: true };
}

// Send leave approval email
export async function sendLeaveApprovalEmail(employee, leaveApplication) {
  const status = leaveApplication.status === 'approved' ? 'Approved' : 'Rejected';
  const subject = `Leave Application ${status}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00b3c6;">Leave Application ${status}</h2>
      <p>Hello ${employee.first_name},</p>
      <p>Your leave application has been <strong>${status.toLowerCase()}</strong>.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Start Date: ${new Date(leaveApplication.start_date).toLocaleDateString()}</li>
        <li>End Date: ${new Date(leaveApplication.end_date).toLocaleDateString()}</li>
        <li>Total Days: ${leaveApplication.total_days}</li>
        ${leaveApplication.rejection_reason ? `<li>Reason: ${leaveApplication.rejection_reason}</li>` : ''}
      </ul>
      <p>Best regards,<br>Codeat Infotech HR Team</p>
    </div>
  `;

  const [users] = await pool.execute(
    `SELECT email FROM users WHERE id = ?`,
    [employee.user_id]
  );

  if (users.length > 0) {
    await queueEmail(users[0].email, subject, html);
  }

  return { success: true };
}

// Send onboarding email
export async function sendOnboardingEmail(employee, user) {
  const subject = 'Welcome to Codeat Infotech';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00b3c6;">Welcome to Codeat Infotech!</h2>
      <p>Hello ${employee.first_name} ${employee.last_name},</p>
      <p>We are excited to have you join our team!</p>
      <p><strong>Your Login Credentials:</strong></p>
      <ul>
        <li>Email: ${user.email}</li>
        <li>Employee ID: ${employee.employee_id}</li>
      </ul>
      <p>Please log in to the ERP system and complete your profile.</p>
      <p>Best regards,<br>Codeat Infotech HR Team</p>
    </div>
  `;

  await queueEmail(user.email, subject, html);
  return { success: true };
}

// Send welcome email with login credentials to new employee/intern
export async function sendWelcomeEmailWithCredentials(employeeData) {
  const { email, password, firstName, lastName, employeeId, role, designation, department, joiningDate } = employeeData;
  
  const roleDisplay = role === 'intern' ? 'Intern' : role === 'project_manager' ? 'Project Manager' : 'Employee';
  const loginUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  const subject = `🎉 Welcome to Codeat Infotech - Your Login Credentials`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1A656D 0%, #0A2A2D 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Codeat Infotech! 🎉</h1>
                  <p style="color: #8db2b6; margin: 10px 0 0 0; font-size: 16px;">Your journey with us begins today</p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear <strong>${firstName} ${lastName}</strong>,
                  </p>
                  
                  <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                    We are thrilled to welcome you to the Codeat Infotech family as a <strong>${roleDisplay}</strong>! 
                    Your account has been successfully created in our ERP system.
                  </p>
                  
                  <!-- Credentials Box -->
                  <div style="background: linear-gradient(135deg, #f8fffe 0%, #e8f5f5 100%); border: 2px solid #1A656D; border-radius: 12px; padding: 25px; margin: 25px 0;">
                    <h3 style="color: #1A656D; margin: 0 0 20px 0; font-size: 18px; text-align: center;">
                      🔐 Your Login Credentials
                    </h3>
                    
                    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #666; width: 40%; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>📧 Email:</strong>
                        </td>
                        <td style="color: #1A656D; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${email}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>🔑 Password:</strong>
                        </td>
                        <td style="color: #d32f2f; font-weight: 600; font-family: 'Courier New', monospace; padding: 10px 0; border-bottom: 1px solid #e0e0e0; background: #fff5f5; border-radius: 4px; padding-left: 10px;">
                          ${password}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>🆔 Employee ID:</strong>
                        </td>
                        <td style="color: #1A656D; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${employeeId}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>👤 Role:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${roleDisplay}
                        </td>
                      </tr>
                      ${department ? `
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>🏢 Department:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${department}
                        </td>
                      </tr>` : ''}
                      ${designation ? `
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>💼 Designation:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${designation}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="color: #666; padding: 10px 0;">
                          <strong>📅 Joining Date:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0;">
                          ${joiningDate ? new Date(joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Today'}
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Login Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #1A656D 0%, #175b62 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(26, 101, 109, 0.3);">
                      🚀 Login to ERP Portal
                    </a>
                  </div>
                  
                  <!-- Security Notice -->
                  <div style="background: #fff8e1; border-left: 4px solid #ffa000; padding: 15px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                    <p style="color: #f57c00; margin: 0; font-size: 14px;">
                      <strong>⚠️ Security Notice:</strong> Please change your password after your first login. 
                      Keep your credentials secure and do not share them with anyone.
                    </p>
                  </div>
                  
                  <!-- What's Next -->
                  <div style="margin: 25px 0;">
                    <h3 style="color: #1A656D; margin: 0 0 15px 0; font-size: 16px;">📋 What's Next?</h3>
                    <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Login to the ERP portal using your credentials</li>
                      <li>Complete your profile with personal details</li>
                      <li>Familiarize yourself with the dashboard</li>
                      <li>Reach out to HR if you have any questions</li>
                    </ul>
                  </div>
                  
                  <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                    We're excited to have you on board! If you have any questions, feel free to reach out to the HR team.
                  </p>
                  
                  <p style="color: #333; font-size: 14px; margin: 25px 0 0 0;">
                    Best regards,<br>
                    <strong style="color: #1A656D;">Codeat Infotech HR Team</strong>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #888; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Codeat Infotech. All rights reserved.
                  </p>
                  <p style="color: #aaa; font-size: 11px; margin: 10px 0 0 0;">
                    This is an automated email. Please do not reply to this message.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Send email directly (not queued, as this is important)
  const result = await sendEmail(email, subject, html);
  
  console.log(`Welcome email sent to ${email}: ${result.success ? 'SUCCESS' : 'FAILED - ' + result.error}`);
  
  return result;
}

// Send payment receipt email to intern
export async function sendPaymentReceiptEmail(paymentData) {
  const {
    email,
    internName,
    employeeId,
    receiptNumber,
    paymentAmount,
    paymentDate,
    paymentMethod,
    totalFees,
    paidAmount,
    remainingAmount,
    transactionId
  } = paymentData;

  const subject = `Payment Receipt - ${receiptNumber} - Codeat Infotech`;
  
  const formattedDate = new Date(paymentDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1A656D 0%, #0A2A2D 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Payment Receipt</h1>
                  <p style="color: #8db2b6; margin: 10px 0 0 0; font-size: 16px;">Receipt Number: ${receiptNumber}</p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear <strong>${internName}</strong>,
                  </p>
                  
                  <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                    This is to confirm that we have received your payment. Please find the payment details below:
                  </p>
                  
                  <!-- Payment Details Box -->
                  <div style="background: linear-gradient(135deg, #f8fffe 0%, #e8f5f5 100%); border: 2px solid #1A656D; border-radius: 12px; padding: 25px; margin: 25px 0;">
                    <h3 style="color: #1A656D; margin: 0 0 20px 0; font-size: 18px; text-align: center;">
                      💰 Payment Details
                    </h3>
                    
                    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #666; width: 40%; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>Receipt Number:</strong>
                        </td>
                        <td style="color: #1A656D; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${receiptNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>Payment Amount:</strong>
                        </td>
                        <td style="color: #d32f2f; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ₹${paymentAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>Payment Date:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${formattedDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>Payment Method:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace('_', ' ')}
                        </td>
                      </tr>
                      ${transactionId ? `
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>Transaction ID:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${transactionId}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>Employee ID:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${employeeId}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Fees Summary Box -->
                  <div style="background: #fff8e1; border-left: 4px solid #ffa000; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                    <h3 style="color: #f57c00; margin: 0 0 15px 0; font-size: 16px;">
                      📊 Fees Summary
                    </h3>
                    <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #666; padding: 8px 0;">Total Fees:</td>
                        <td style="color: #333; font-weight: 600; text-align: right; padding: 8px 0;">₹${totalFees.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 8px 0;">Amount Paid:</td>
                        <td style="color: #2e7d32; font-weight: 600; text-align: right; padding: 8px 0;">₹${paidAmount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 8px 0; border-top: 1px solid #e0e0e0;">Remaining Amount:</td>
                        <td style="color: #d32f2f; font-weight: 600; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">₹${remainingAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                    You can download your receipt from the ERP portal by logging in to your account.
                  </p>
                  
                  <p style="color: #333; font-size: 14px; margin: 25px 0 0 0;">
                    Best regards,<br>
                    <strong style="color: #1A656D;">Codeat Infotech Finance Team</strong>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #888; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Codeat Infotech. All rights reserved.
                  </p>
                  <p style="color: #aaa; font-size: 11px; margin: 10px 0 0 0;">
                    This is an automated email. Please do not reply to this message.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Send email directly
  const result = await sendEmail(email, subject, html);
  
  console.log(`Payment receipt email sent to ${email}: ${result.success ? 'SUCCESS' : 'FAILED - ' + result.error}`);
  
  return result;
}

