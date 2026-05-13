import nodemailer from 'nodemailer';

/**
 * Shared Nodemailer transporter using Gmail SMTP.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables.
 *
 * To get an App Password:
 * 1. Go to https://myaccount.google.com/apppasswords
 * 2. Select "Mail" → Generate
 * 3. Copy the 16-character password (no spaces)
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send an email using Gmail SMTP.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = `Skyline <${process.env.GMAIL_USER}>`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return info;
}
