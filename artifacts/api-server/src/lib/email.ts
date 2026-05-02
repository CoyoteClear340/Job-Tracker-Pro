import nodemailer from "nodemailer";
import { logger } from "./logger";

export interface EmailConfig {
  configured: boolean;
  notifyEmail: string | null;
  smtpHost: string | null;
}

export function getEmailConfig(): EmailConfig {
  const smtpHost = process.env["SMTP_HOST"] ?? null;
  const smtpUser = process.env["SMTP_USER"] ?? null;
  const smtpPass = process.env["SMTP_PASS"] ?? null;
  const notifyEmail = process.env["NOTIFY_EMAIL"] ?? null;

  const configured = !!(smtpHost && smtpUser && smtpPass && notifyEmail);

  return { configured, notifyEmail, smtpHost };
}

function createTransport() {
  const smtpHost = process.env["SMTP_HOST"];
  const smtpPort = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
  const smtpUser = process.env["SMTP_USER"];
  const smtpPass = process.env["SMTP_PASS"];

  if (!smtpHost || !smtpUser || !smtpPass) return null;

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  const transport = createTransport();
  if (!transport) {
    logger.warn("Email not sent: SMTP not configured");
    return { success: false, error: "SMTP not configured" };
  }

  const from = process.env["SMTP_USER"];

  try {
    await transport.sendMail({ from, ...opts });
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
    return { success: true };
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return { success: false, error: String(err) };
  }
}

export async function sendAlertNotificationEmail(opts: {
  keyword: string;
  company: string;
  role: string;
  applicationId: number;
}): Promise<{ success: boolean; error?: string }> {
  const notifyEmail = process.env["NOTIFY_EMAIL"];
  if (!notifyEmail) return { success: false, error: "NOTIFY_EMAIL not set" };

  const subject = `[TERM_TRACK] Alert: ${opts.keyword} match at ${opts.company}`;
  const html = `
    <div style="font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-radius: 8px; border: 1px solid #22c55e33;">
      <h2 style="color: #22c55e; margin: 0 0 16px;">TERM_TRACK // ALERT_TRIGGERED</h2>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 16px; letter-spacing: 1px;">JOB ALERT MATCH DETECTED</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; padding: 4px 0; width: 120px;">KEYWORD</td><td style="color: #22c55e;">${opts.keyword}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">COMPANY</td><td style="color: #e0e0e0;">${opts.company}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">ROLE</td><td style="color: #e0e0e0;">${opts.role}</td></tr>
        <tr><td style="color: #6b7280; padding: 4px 0;">APP_ID</td><td style="color: #e0e0e0;">#${opts.applicationId}</td></tr>
      </table>
    </div>
  `;
  const text = `TERM_TRACK ALERT: "${opts.keyword}" matched at ${opts.company} (${opts.role}). Application #${opts.applicationId}.`;

  return sendEmail({ to: notifyEmail, subject, html, text });
}
