import { env } from '../config/env.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend API.
 * Falls back to console.log in development if no API key is set.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log('──────────────────────────────────────────');
    console.log(`📧 EMAIL (dev mode — no RESEND_API_KEY set)`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.html}`);
    console.log('──────────────────────────────────────────');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email: ${res.status} ${body}`);
  }
}

export function verificationEmail(email: string, token: string): EmailOptions {
  const url = `${env.APP_URL}/verify-email?token=${token}`;
  return {
    to: email,
    subject: 'Verify your ThreatPad email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">ThreatPad</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create a ThreatPad account, you can ignore this email.</p>
      </div>
    `,
  };
}

export function passwordResetEmail(email: string, token: string): EmailOptions {
  const url = `${env.APP_URL}/reset-password?token=${token}`;
  return {
    to: email,
    subject: 'Reset your ThreatPad password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">ThreatPad</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `,
  };
}
