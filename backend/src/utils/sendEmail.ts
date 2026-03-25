import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not set');
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Virtual Study Group <noreply@yourdomain.com>',
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
