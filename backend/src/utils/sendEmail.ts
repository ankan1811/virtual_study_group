import { Resend } from 'resend';
import nodemailer from 'nodemailer';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not set');
    _resend = new Resend(apiKey);
  }
  return _resend;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Virtual Study Group <noreply@yourdomain.com>',
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function sendViaGmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendViaResend(to, subject, html);
  } catch (resendErr) {
    console.warn('Resend failed, falling back to Gmail SMTP:', (resendErr as Error).message);
    await sendViaGmail(to, subject, html);
  }
}
