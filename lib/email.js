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
    // Always create a fresh transporter so env vars are always current
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
      }
    });

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
  
  const subject = `ðŸŽ‰ Welcome to Codeat Infotech - Your Login Credentials`;
  
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Codeat Infotech! ðŸŽ‰</h1>
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
                      ðŸ” Your Login Credentials
                    </h3>
                    
                    <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #666; width: 40%; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>ðŸ“§ Email:</strong>
                        </td>
                        <td style="color: #1A656D; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${email}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>ðŸ”‘ Password:</strong>
                        </td>
                        <td style="color: #d32f2f; font-weight: 600; font-family: 'Courier New', monospace; padding: 10px 0; border-bottom: 1px solid #e0e0e0; background: #fff5f5; border-radius: 4px; padding-left: 10px;">
                          ${password}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>ðŸ†” Employee ID:</strong>
                        </td>
                        <td style="color: #1A656D; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${employeeId}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>ðŸ‘¤ Role:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${roleDisplay}
                        </td>
                      </tr>
                      ${department ? `
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>ðŸ¢ Department:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${department}
                        </td>
                      </tr>` : ''}
                      ${designation ? `
                      <tr>
                        <td style="color: #666; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          <strong>ðŸ’¼ Designation:</strong>
                        </td>
                        <td style="color: #333; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                          ${designation}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="color: #666; padding: 10px 0;">
                          <strong>ðŸ“… Joining Date:</strong>
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
                      ðŸš€ Login to ERP Portal
                    </a>
                  </div>
                  
                  <!-- Security Notice -->
                  <div style="background: #fff8e1; border-left: 4px solid #ffa000; padding: 15px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                    <p style="color: #f57c00; margin: 0; font-size: 14px;">
                      <strong>âš ï¸ Security Notice:</strong> Please change your password after your first login. 
                      Keep your credentials secure and do not share them with anyone.
                    </p>
                  </div>
                  
                  <!-- What's Next -->
                  <div style="margin: 25px 0;">
                    <h3 style="color: #1A656D; margin: 0 0 15px 0; font-size: 16px;">ðŸ“‹ What's Next?</h3>
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
                    Â© ${new Date().getFullYear()} Codeat Infotech. All rights reserved.
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
                      ðŸ’° Payment Details
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
                          â‚¹${paymentAmount.toFixed(2)}
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
                      ðŸ“Š Fees Summary
                    </h3>
                    <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td style="color: #666; padding: 8px 0;">Total Fees:</td>
                        <td style="color: #333; font-weight: 600; text-align: right; padding: 8px 0;">â‚¹${totalFees.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 8px 0;">Amount Paid:</td>
                        <td style="color: #2e7d32; font-weight: 600; text-align: right; padding: 8px 0;">â‚¹${paidAmount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #666; padding: 8px 0; border-top: 1px solid #e0e0e0;">Remaining Amount:</td>
                        <td style="color: #d32f2f; font-weight: 600; text-align: right; padding: 8px 0; border-top: 1px solid #e0e0e0;">â‚¹${remainingAmount.toFixed(2)}</td>
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
                    Â© ${new Date().getFullYear()} Codeat Infotech. All rights reserved.
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


// Send fees reminder email to intern
export async function sendFeesReminderEmail(data) {
  const {
    email,
    internName,
    employeeId,
    totalFees,
    paidAmount,
    remainingAmount,
    requestAmount,
    dueDate,
    notes,
    adminName,
  } = data;

  const balanceAfter = Math.max(0, remainingAmount - requestAmount);
  const willClear    = balanceAfter <= 0;
  const paidPct      = totalFees > 0 ? Math.round((paidAmount / totalFees) * 100) : 0;
  const afterPct     = totalFees > 0 ? Math.min(100, Math.round(((paidAmount + requestAmount) / totalFees) * 100)) : 0;
  const fmtAmt       = (n) => 'â‚¹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today        = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const dueDateFmt   = dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const subject = `âš ï¸ Fees Payment Reminder â€” Please Pay ${fmtAmt(requestAmount)} by ${dueDateFmt || 'Soon'} | Codeat Infotech`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.10);overflow:hidden;max-width:600px;">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#1A656D 0%,#0A2A2D 100%);padding:36px 32px 28px;text-align:center;">
      <div style="font-size:36px;margin-bottom:10px;">ðŸ””</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Fees Payment Reminder</h1>
      <p style="color:#8db2b6;margin:8px 0 0;font-size:13px;">Codeat Infotech Â· Internship Management</p>
    </td>
  </tr>

  <!-- BODY -->
  <tr><td style="padding:32px;">

    <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 6px;">Dear <strong>${internName}</strong>,</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
      This is a reminder regarding your pending internship fees. Please find the payment details below.
    </p>

    <!-- BIG REQUEST BOX -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);border:2px solid #ff9800;border-radius:14px;margin:0 0 24px;overflow:hidden;">
      <tr>
        <td style="background:#e65100;padding:10px 20px;">
          <span style="color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">âš ï¸ Payment Requested</span>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="color:#bf360c;font-size:13px;font-weight:600;margin:0 0 6px;">Please Pay</p>
          <p style="color:#bf360c;font-size:38px;font-weight:800;margin:0;line-height:1;">${fmtAmt(requestAmount)}</p>
          ${dueDateFmt ? `<p style="color:#e65100;font-size:14px;font-weight:700;margin:10px 0 0;">ðŸ“… By: <strong>${dueDateFmt}</strong></p>` : ''}
          ${willClear ? `<p style="color:#2e7d32;font-size:13px;font-weight:600;margin:10px 0 0;background:#e8f5e9;padding:6px 14px;border-radius:20px;display:inline-block;">âœ… This will clear your fees completely!</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- FEES BREAKDOWN TABLE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;margin:0 0 24px;">
      <tr>
        <td style="background:#1A656D;padding:10px 16px;">
          <span style="color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">ðŸ“Š Fees Breakdown</span>
        </td>
      </tr>
      <tr>
        <td style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr style="background:#f8f9fa;">
              <td style="padding:12px 16px;color:#666;border-bottom:1px solid #eee;">Total Course Fees</td>
              <td style="padding:12px 16px;color:#1A656D;font-weight:700;text-align:right;border-bottom:1px solid #eee;">${fmtAmt(totalFees)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#666;border-bottom:1px solid #eee;">Already Paid</td>
              <td style="padding:12px 16px;color:#2e7d32;font-weight:700;text-align:right;border-bottom:1px solid #eee;">${fmtAmt(paidAmount)}</td>
            </tr>
            <tr style="background:#fff8e1;">
              <td style="padding:12px 16px;color:#e65100;font-weight:700;border-bottom:1px solid #eee;">Pay Now (Requested)</td>
              <td style="padding:12px 16px;color:#e65100;font-weight:800;text-align:right;border-bottom:1px solid #eee;">${fmtAmt(requestAmount)}</td>
            </tr>
            <tr style="background:${willClear ? '#e8f5e9' : '#fff3f3'};">
              <td style="padding:12px 16px;color:${willClear ? '#2e7d32' : '#c62828'};font-weight:700;">Balance After Payment</td>
              <td style="padding:12px 16px;color:${willClear ? '#2e7d32' : '#c62828'};font-weight:800;text-align:right;">${fmtAmt(balanceAfter)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- PROGRESS BAR -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td>
          <p style="color:#888;font-size:12px;margin:0 0 6px;">Payment Progress after this payment: <strong style="color:#1A656D;">${afterPct}%</strong></p>
          <div style="background:#e0e0e0;border-radius:99px;height:12px;overflow:hidden;">
            <div style="float:left;background:#43a047;width:${paidPct}%;height:12px;"></div>
            <div style="float:left;background:#ff9800;width:${Math.min(afterPct - paidPct, 100 - paidPct)}%;height:12px;"></div>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;font-size:11px;">
            <tr>
              <td style="color:#43a047;">&#9632; Paid (${paidPct}%)</td>
              <td style="color:#ff9800;text-align:center;">&#9632; Requested (${afterPct - paidPct}%)</td>
              <td style="color:#bbb;text-align:right;">&#9632; Remaining (${100 - afterPct}%)</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- INTERN DETAILS -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:10px;margin:0 0 20px;">
      <tr><td style="padding:14px 16px;">
        <p style="color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Intern Details</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#666;padding:3px 0;width:40%;">Name</td>
            <td style="color:#333;font-weight:600;padding:3px 0;">${internName}</td>
          </tr>
          <tr>
            <td style="color:#666;padding:3px 0;">Employee ID</td>
            <td style="color:#333;font-weight:600;padding:3px 0;">${employeeId}</td>
          </tr>
          <tr>
            <td style="color:#666;padding:3px 0;">Reminder Date</td>
            <td style="color:#333;font-weight:600;padding:3px 0;">${today}</td>
          </tr>
          ${dueDateFmt ? `<tr>
            <td style="color:#e65100;font-weight:700;padding:3px 0;">Pay By</td>
            <td style="color:#e65100;font-weight:700;padding:3px 0;">${dueDateFmt}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>

    ${notes ? `
    <!-- ADMIN NOTE -->
    <div style="background:#e8f4fd;border-left:4px solid #1976d2;padding:14px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
      <p style="color:#1565c0;font-size:12px;font-weight:700;margin:0 0 5px;text-transform:uppercase;">ðŸ“ Note from Admin</p>
      <p style="color:#333;font-size:14px;margin:0;line-height:1.6;">${notes}</p>
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.NEXT_PUBLIC_API_URL || 'https://erp.codeatinfotech.com'}/fees"
         style="display:inline-block;background:linear-gradient(135deg,#1A656D,#175b62);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(26,101,109,0.35);">
        View My Fees Portal â†’
      </a>
    </div>

    <p style="color:#777;font-size:13px;line-height:1.7;margin:20px 0 0;">
      If you have already made the payment or have any queries, please contact the finance team immediately.
    </p>
    <p style="color:#333;font-size:14px;margin:16px 0 0;">
      Regards,<br/>
      <strong style="color:#1A656D;">${adminName || 'Codeat Infotech Finance Team'}</strong>
    </p>

  </td></tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8f9fa;padding:18px 32px;text-align:center;border-top:1px solid #e9ecef;">
      <p style="color:#aaa;font-size:11px;margin:0;">Â© ${new Date().getFullYear()} Codeat Infotech. All rights reserved.</p>
      <p style="color:#bbb;font-size:11px;margin:5px 0 0;">This is an automated reminder. Please do not reply to this email.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const result = await sendEmail(email, subject, html);
  console.log(`Fees reminder sent to ${email}: ${result.success ? 'SUCCESS' : 'FAILED - ' + result.error}`);
  return result;
}

