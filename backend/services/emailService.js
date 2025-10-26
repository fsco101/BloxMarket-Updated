import nodemailer from 'nodemailer';

// Create transporter for sending emails
// NOTE: For Gmail, if 2FA is enabled, use an App Password instead of your regular password
// Generate an App Password at: https://myaccount.google.com/apppasswords
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // false for TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });
};

// Generate a 6-digit verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, verificationCode, username = 'there') => {
  try {
    console.log('📧 Attempting to send verification email...');
    console.log('Email:', email);

    const transporter = createTransporter();

    const mailOptions = {
      from: `"BloxMarket" <${process.env.SMTP_USER || 'noreply@bloxmarket.com'}>`,
      to: email,
      subject: 'Verify Your BloxMarket Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">BloxMarket</h1>
            <p style="color: #6b7280; margin: 5px 0;">The Ultimate Roblox Trading Community</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome to BloxMarket!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining our community. To complete your registration and start trading, please verify your email address.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #3b82f6; color: white; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 8px; display: inline-block; letter-spacing: 3px;">
                ${verificationCode}
              </div>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 10px;">
              <strong>Verification Code:</strong> ${verificationCode}
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              This code will expire in 15 minutes. Please enter it in the verification form to complete your registration.
            </p>
          </div>

          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If you didn't create an account with BloxMarket, please ignore this email.</p>
            <p>Need help? Contact our support team at support@bloxmarket.com</p>
          </div>
        </div>
      `
    };

    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    if (error.code === 'EAUTH' && error.response.includes('534')) {
      throw new Error(`Failed to send verification email: Gmail authentication failed. If using Gmail with 2FA, please use an App Password instead of your regular password. Generate one at: https://myaccount.google.com/apppasswords`);
    }
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// Send password reset email (for future use)
export const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const transporter = createTransporter();

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"BloxMarket" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your BloxMarket Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">BloxMarket</h1>
            <p style="color: #6b7280; margin: 5px 0;">Password Reset Request</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${username},</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
          </div>

          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>Need help? Contact our support team at support@bloxmarket.com</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};