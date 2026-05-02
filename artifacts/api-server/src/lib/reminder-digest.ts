import { db, remindersTable, applicationsTable } from "@workspace/db";
import { eq, and, lte, asc } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, getEmailConfig } from "./email";

export interface DigestResult {
  sent: boolean;
  reminderCount: number;
  error?: string;
}

function formatDueLabel(dueAt: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `OVERDUE by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`;
  if (diffDays === 0) return "Due TODAY";
  if (diffDays === 1) return "Due TOMORROW";
  return `Due in ${diffDays} days`;
}

function urgencyColor(dueAt: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "#ef4444";
  if (diffDays === 0) return "#eab308";
  return "#22c55e";
}

function buildDigestHtml(reminders: Array<{
  id: number;
  applicationId: number;
  dueAt: Date;
  note: string | null;
  company: string | null;
  role: string | null;
}>): string {
  const rows = reminders.map((r) => {
    const color = urgencyColor(r.dueAt);
    const label = formatDueLabel(r.dueAt);
    const timeStr = r.dueAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return `
      <tr style="border-bottom:1px solid #1f1f1f;">
        <td style="padding:12px 8px;vertical-align:top;">
          <span style="color:${color};font-weight:bold;font-size:11px;font-family:monospace;background:${color}18;border:1px solid ${color}33;border-radius:4px;padding:2px 6px;white-space:nowrap;">${label}</span>
        </td>
        <td style="padding:12px 8px;vertical-align:top;">
          <div style="font-weight:bold;color:#e0e0e0;">${r.company ?? "Unknown Company"}</div>
          <div style="color:#9ca3af;font-size:12px;">${r.role ?? ""}</div>
        </td>
        <td style="padding:12px 8px;vertical-align:top;color:#6b7280;font-family:monospace;font-size:11px;">${timeStr}</td>
        <td style="padding:12px 8px;vertical-align:top;color:#9ca3af;font-size:12px;">${r.note ?? "—"}</td>
      </tr>
    `;
  }).join("");

  const overdueCount = reminders.filter((r) => r.dueAt < new Date()).length;
  const todayCount = reminders.filter((r) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    return r.dueAt >= today && r.dueAt < tomorrow;
  }).length;

  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:0;max-width:640px;margin:0 auto;border-radius:10px;border:1px solid #22c55e33;overflow:hidden;">
      <!-- Header -->
      <div style="background:#0d1117;border-bottom:1px solid #1f2937;padding:24px 28px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <span style="color:#22c55e;font-size:18px;font-weight:bold;">TERM_TRACK</span>
          <span style="color:#374151;font-size:14px;">//</span>
          <span style="color:#6b7280;font-size:13px;letter-spacing:1px;">REMINDER_DIGEST</span>
        </div>
        <p style="color:#4b5563;font-size:12px;margin:0;">${dateStr.toUpperCase()}</p>
      </div>

      <!-- Summary -->
      <div style="padding:20px 28px;background:#0f0f0f;border-bottom:1px solid #1f1f1f;display:flex;gap:24px;">
        <div style="text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#22c55e;">${reminders.length}</div>
          <div style="font-size:10px;color:#6b7280;letter-spacing:1px;">TOTAL</div>
        </div>
        ${overdueCount > 0 ? `<div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:#ef4444;">${overdueCount}</div><div style="font-size:10px;color:#6b7280;letter-spacing:1px;">OVERDUE</div></div>` : ""}
        ${todayCount > 0 ? `<div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:#eab308;">${todayCount}</div><div style="font-size:10px;color:#6b7280;letter-spacing:1px;">TODAY</div></div>` : ""}
      </div>

      <!-- Table -->
      <div style="padding:0 28px 28px;">
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <thead>
            <tr style="border-bottom:1px solid #1f2937;">
              <th style="text-align:left;padding:8px;color:#4b5563;font-size:10px;letter-spacing:1px;">STATUS</th>
              <th style="text-align:left;padding:8px;color:#4b5563;font-size:10px;letter-spacing:1px;">APPLICATION</th>
              <th style="text-align:left;padding:8px;color:#4b5563;font-size:10px;letter-spacing:1px;">TIME</th>
              <th style="text-align:left;padding:8px;color:#4b5563;font-size:10px;letter-spacing:1px;">NOTE</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:16px 28px;background:#0d1117;border-top:1px solid #1f2937;">
        <p style="color:#374151;font-size:11px;margin:0;letter-spacing:0.5px;">This digest was sent by TERM_TRACK. Mark reminders done in the app to stop receiving them.</p>
      </div>
    </div>
  `;
}

export async function sendReminderDigest(): Promise<DigestResult> {
  const config = getEmailConfig();
  if (!config.configured || !config.notifyEmail) {
    return { sent: false, reminderCount: 0, error: "SMTP not configured" };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const rows = await db
    .select({
      id: remindersTable.id,
      applicationId: remindersTable.applicationId,
      dueAt: remindersTable.dueAt,
      note: remindersTable.note,
      company: applicationsTable.company,
      role: applicationsTable.role,
    })
    .from(remindersTable)
    .leftJoin(applicationsTable, eq(remindersTable.applicationId, applicationsTable.id))
    .where(and(eq(remindersTable.done, false), lte(remindersTable.dueAt, tomorrow)))
    .orderBy(asc(remindersTable.dueAt));

  if (rows.length === 0) {
    logger.info("Reminder digest: no pending reminders, skipping email");
    return { sent: false, reminderCount: 0 };
  }

  const overdueCount = rows.filter((r) => r.dueAt < new Date()).length;
  const subjectPrefix = overdueCount > 0 ? `⚠️ ${overdueCount} OVERDUE — ` : "";
  const subject = `[TERM_TRACK] ${subjectPrefix}${rows.length} Reminder${rows.length !== 1 ? "s" : ""} Due`;

  const textRows = rows.map((r) => `• ${r.company ?? "?"} (${r.role ?? "?"}) — ${formatDueLabel(r.dueAt)}${r.note ? `: ${r.note}` : ""}`).join("\n");
  const text = `TERM_TRACK REMINDER DIGEST\n${new Date().toDateString()}\n\n${textRows}\n\nMark reminders done in the app to stop receiving them.`;

  const html = buildDigestHtml(rows);

  const result = await sendEmail({ to: config.notifyEmail, subject, html, text });

  if (result.success) {
    logger.info({ count: rows.length }, "Reminder digest sent");
    return { sent: true, reminderCount: rows.length };
  }

  logger.error({ error: result.error }, "Reminder digest failed");
  return { sent: false, reminderCount: rows.length, error: result.error };
}

export function startReminderDigestScheduler(): void {
  logger.info("Reminder digest scheduler started (daily at 08:00)");

  const scheduleNextDigest = () => {
    const now = new Date();
    const next8am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
    if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
    const msUntil = next8am.getTime() - now.getTime();

    logger.info({ nextRunAt: next8am.toISOString(), msUntil }, "Next reminder digest scheduled");

    setTimeout(async () => {
      try {
        const result = await sendReminderDigest();
        logger.info(result, "Scheduled reminder digest complete");
      } catch (err) {
        logger.error({ err }, "Scheduled reminder digest failed");
      }
      scheduleNextDigest();
    }, msUntil);
  };

  scheduleNextDigest();
}
