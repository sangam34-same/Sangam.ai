const nodemailer = require('nodemailer');
const { isProduction, isTest } = require('../config/env');

let transporter = null;

function createTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    if (isProduction) {
      throw new Error('Email configuration missing in production');
    }
    console.warn('Email not configured, using mock transporter');
    return createMockTransporter();
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
  });

  return transporter;
}

function createMockTransporter() {
  return {
    sendMail: async (options) => {
      console.log('MOCK EMAIL:', {
        to: options.to,
        subject: options.subject,
        html: options.html?.substring(0, 200),
      });
      return { messageId: 'mock-message-id' };
    },
  };
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || 'noreply@sangam.ai';

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendPasswordResetEmail(email, resetToken, frontendUrl) {
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
  const subject = 'Reset your Sangam.ai password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 32px;">
        <h1 style="color: #1e293b; margin-bottom: 16px;">Reset your password</h1>
        <p style="color: #475569; margin-bottom: 24px;">
          You requested a password reset for your Sangam.ai account. Click the button below to create a new password:
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
          This link expires in 15 minutes for security.
        </p>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">
          If the button doesn't work, copy this link: ${resetUrl}
        </p>
      </div>
    </body>
    </html>
  `;
  const text = `Reset your password: ${resetUrl}. This link expires in 15 minutes.`;

  return sendEmail({ to: email, subject, html, text });
}

async function sendPasswordChangeNotification(email, ip, userAgent) {
  const subject = 'Your Sangam.ai password was changed';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 32px;">
        <h1 style="color: #1e293b; margin-bottom: 16px;">Password changed</h1>
        <p style="color: #475569; margin-bottom: 24px;">
          Your Sangam.ai account password was successfully changed. All active sessions have been revoked for security.
        </p>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
          Time: ${new Date().toISOString()}
        </p>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
          IP: ${ip}
        </p>
        <p style="color: #64748b; font-size: 14px;">
          If this wasn't you, please contact support immediately.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

async function sendExistingUserNotification(email) {
  const subject = 'Account registration attempt';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 32px;">
        <h1 style="color: #1e293b; margin-bottom: 16px;">Registration attempt</h1>
        <p style="color: #475569; margin-bottom: 24px;">
          Someone tried to register an account with this email address. If this was you, please log in instead.
        </p>
        <p style="color: #64748b; font-size: 14px;">
          If this wasn't you, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangeNotification,
  sendExistingUserNotification,
};