'use strict';

const nodemailer = require('nodemailer');
const axios = require('axios');
const { env } = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

class NotificationService {
  async sendEmail(to, subject, htmlContent) {
    if (!env.SMTP_USER) {
      console.log(`[Email] Dev mode — would send to ${to}: ${subject}\n${htmlContent}`);
      return;
    }
    try {
      await getTransporter().sendMail({
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
        to,
        subject,
        html: htmlContent,
      });
    } catch (err) {
      // SMTP send failed (e.g. placeholder/misconfigured credentials). Log the
      // full content as a fallback so links/tokens (password reset, email
      // verification) are never silently lost — this error is intentionally
      // NOT rethrown so the caller's own try/catch dev-fallback logging (which
      // never fires here since no exception propagates) isn't relied upon.
      console.error(`[Email] Failed to send to ${to}: ${err.message}`);
      console.log(`[Email] Fallback content for ${to}: ${subject}\n${htmlContent}`);
    }
  }

  async sendSMS(phone, message) {
    if (!env.MSG91_API_KEY) {
      console.log(`[SMS] Dev mode — would send to ${phone}: ${message}`);
      return;
    }
    try {
      await axios.post(
        'https://api.msg91.com/api/sendhttp.php',
        null,
        {
          params: {
            authkey: env.MSG91_API_KEY,
            mobiles: phone,
            message,
            sender: env.MSG91_SENDER_ID,
            route: 4,
          },
        }
      );
    } catch (err) {
      console.error(`[SMS] Failed to send to ${phone}:`, err.message);
    }
  }

  async sendBookingConfirmation(userEmail, booking) {
    const subject = `Booking Confirmed — ${booking.bookingNumber}`;
    const html = `
      <h2>Booking Confirmed!</h2>
      <p>Your booking <strong>${booking.bookingNumber}</strong> has been confirmed.</p>
      <p>Check-in: <strong>${booking.checkInDate}</strong></p>
      <p>Check-out: <strong>${booking.checkOutDate}</strong></p>
      <p>Total: <strong>₹${booking.totalAmount}</strong></p>
    `;
    await this.sendEmail(userEmail, subject, html);
  }

  async sendPasswordResetEmail(userEmail, token, name) {
    const subject = 'Password Reset Request';
    const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    const html = `
      <h2>Password Reset</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `;
    await this.sendEmail(userEmail, subject, html);
  }

  async sendVerificationEmail(userEmail, token, name) {
    const subject = 'Verify Your Email';
    const verifyUrl = `${env.FRONTEND_URL}/auth/verify-email?token=${token}`;
    const html = `
      <h2>Email Verification</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Click to verify your email address:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `;
    await this.sendEmail(userEmail, subject, html);
  }

  async sendRegistrationEmail(userEmail, token) {
    const subject = 'Verify Your Email to Create Your Account';
    const completeUrl = `${env.FRONTEND_URL}/auth/register/complete?token=${token}`;
    const html = `
      <h2>Welcome!</h2>
      <p>Thanks for signing up. Click the link below to verify your email and finish creating your account. This link expires in 24 hours.</p>
      <a href="${completeUrl}">${completeUrl}</a>
    `;
    await this.sendEmail(userEmail, subject, html);
  }
}

module.exports = new NotificationService();
