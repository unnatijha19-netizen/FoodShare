
const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error('Email configuration is missing from .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"FoodShare" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your FoodShare password',
    text: [
      'We received a request to reset your FoodShare password.',
      '',
      `Open this link to choose a new password: ${resetUrl}`,
      '',
      'This link expires in 15 minutes and can only be used once.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#26382c">
        <h2 style="color:#315c40">Reset your FoodShare password</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#315c40;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">
            Reset Password
          </a>
        </p>
        <p>This link expires in <strong>15 minutes</strong> and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
