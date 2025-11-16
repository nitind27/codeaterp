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

