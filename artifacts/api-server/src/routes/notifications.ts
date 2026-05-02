import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getEmailConfig, sendEmail } from "../lib/email";
import { scanAlerts } from "../lib/alert-scanner";

const router = Router();

function formatNotif(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    alertId: n.alertId,
    applicationId: n.applicationId,
    message: n.message,
    read: n.read,
    emailSent: n.emailSent,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", async (req, res) => {
  const unreadOnly = req.query["unreadOnly"] === "true";

  const rows = unreadOnly
    ? await db.select().from(notificationsTable).where(eq(notificationsTable.read, false))
    : await db.select().from(notificationsTable);

  const sorted = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  res.json(sorted.map(formatNotif));
});

router.post("/notifications/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(formatNotif(updated));
});

router.delete("/notifications/clear", async (_req, res) => {
  await db.delete(notificationsTable).where(eq(notificationsTable.read, true));
  res.status(204).end();
});

router.get("/notifications/email-config", (_req, res) => {
  res.json(getEmailConfig());
});

router.post("/notifications/send-test-email", async (req, res) => {
  const to = req.body?.to as string | undefined;
  if (!to) {
    res.status(400).json({ error: "Missing 'to' field" });
    return;
  }

  const config = getEmailConfig();
  if (!config.configured) {
    res.json({ success: false, message: "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and NOTIFY_EMAIL environment variables." });
    return;
  }

  const result = await sendEmail({
    to,
    subject: "[TERM_TRACK] Test Email — SMTP Verified",
    html: `<div style="font-family:monospace;padding:16px;background:#0a0a0a;color:#22c55e;border-radius:8px;border:1px solid #22c55e33;"><h2>TERM_TRACK // SMTP_TEST_OK</h2><p style="color:#9ca3af;">Your email notifications are configured and working.</p></div>`,
    text: "TERM_TRACK: Your email notification SMTP config is working correctly.",
  });

  res.json({ success: result.success, message: result.success ? "Test email sent successfully!" : (result.error ?? "Failed to send") });
});

router.post("/notifications/scan", async (_req, res) => {
  const result = await scanAlerts();
  res.json(result);
});

export default router;
