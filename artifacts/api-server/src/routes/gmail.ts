import { Router } from "express";
import { db, gmailSyncTable, applicationsTable } from "@workspace/db";
import { desc, ilike, and } from "drizzle-orm";

const router = Router();

// Simple keyword patterns to detect job application emails
const APPLICATION_PATTERNS = [
  /thank you for (applying|your application)/i,
  /application (received|submitted|confirmed)/i,
  /we received your (application|resume)/i,
  /your application (to|for|at)/i,
  /applied (to|for|at)/i,
];

const INTERVIEW_PATTERNS = [
  /interview (invitation|request|scheduled)/i,
  /we('d| would) (like to|love to) (schedule|invite)/i,
  /next step(s)?/i,
  /move (forward|to the next)/i,
  /technical (screen|interview)/i,
];

const REJECTION_PATTERNS = [
  /we('ve| have) decided (not to|to move forward with other)/i,
  /not (moving forward|selected|a match)/i,
  /we will not be (moving|proceeding)/i,
  /(unfortunately|regret to inform)/i,
  /other candidate/i,
];

const OFFER_PATTERNS = [
  /offer letter/i,
  /pleased to offer/i,
  /job offer/i,
  /offer of employment/i,
];

const SCAM_PATTERNS = [
  /without (applying|an application)/i,
  /unsolicited (offer|opportunity)/i,
  /(wire transfer|gift card|bitcoin)/i,
  /work from home.*\$\d+/i,
  /no experience (needed|required)/i,
];

function detectStatus(subject: string, body: string): string {
  const text = `${subject} ${body}`;
  if (OFFER_PATTERNS.some((p) => p.test(text))) return "offer";
  if (INTERVIEW_PATTERNS.some((p) => p.test(text))) return "interview";
  if (REJECTION_PATTERNS.some((p) => p.test(text))) return "rejected";
  if (APPLICATION_PATTERNS.some((p) => p.test(text))) return "applied";
  return "applied";
}

function detectScam(subject: string, body: string): { isScam: boolean; reason: string | null } {
  const text = `${subject} ${body}`;
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(text)) {
      return { isScam: true, reason: "Suspicious email pattern detected" };
    }
  }
  return { isScam: false, reason: null };
}

router.post("/gmail/sync", async (req, res) => {
  // Check if Gmail client is available via Replit connectors
  let gmailConnected = false;
  let newApplications = 0;
  let updatedApplications = 0;
  let flaggedScams = 0;
  let synced = 0;

  try {
    // Try to import the Gmail client if it exists
    const { getUncachableGmailClient } = await import("../lib/gmail-client.js").catch(() => ({ getUncachableGmailClient: null }));

    if (getUncachableGmailClient) {
      gmailConnected = true;
      const gmail = await getUncachableGmailClient();

      // Fetch recent messages
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 50,
        q: "newer_than:7d",
      });

      const messages = listResponse.data.messages || [];
      synced = messages.length;

      for (const msg of messages) {
        if (!msg.id) continue;

        const msgData = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = msgData.data.payload?.headers || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const from = headers.find((h) => h.name === "From")?.value || "";
        const snippet = msgData.data.snippet || "";

        // Check if this is job-related
        const isJobRelated =
          APPLICATION_PATTERNS.some((p) => p.test(`${subject} ${snippet}`)) ||
          INTERVIEW_PATTERNS.some((p) => p.test(`${subject} ${snippet}`)) ||
          REJECTION_PATTERNS.some((p) => p.test(`${subject} ${snippet}`)) ||
          OFFER_PATTERNS.some((p) => p.test(`${subject} ${snippet}`));

        if (!isJobRelated) continue;

        // Extract company from email domain or From header
        const emailMatch = from.match(/@([^.>]+)/);
        const company = emailMatch ? emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1) : "Unknown Company";

        const status = detectStatus(subject, snippet);
        const { isScam, reason } = detectScam(subject, snippet);
        if (isScam) flaggedScams++;

        // Check if already tracked (by emailMessageId)
        const existing = await db
          .select()
          .from(applicationsTable)
          .where(
            ilike(applicationsTable.emailMessageId, msg.id)
          )
          .limit(1);

        if (existing.length > 0) {
          // Update status if changed
          if (existing[0].status !== status) {
            await db.update(applicationsTable).set({ status: status as "applied" | "interview" | "offer" | "rejected" | "ghosted", updatedAt: new Date() }).where(
              ilike(applicationsTable.emailMessageId, msg.id)
            );
            updatedApplications++;
          }
        } else {
          // Create new application
          await db.insert(applicationsTable).values({
            company,
            role: "Position",
            status: status as "applied" | "interview" | "offer" | "rejected" | "ghosted",
            source: "Gmail",
            isScam,
            scamReason: reason,
            emailMessageId: msg.id,
            appliedAt: new Date(),
            updatedAt: new Date(),
          });
          newApplications++;
        }
      }

      // Update sync record
      await db
        .insert(gmailSyncTable)
        .values({ lastSyncAt: new Date(), totalEmailsProcessed: synced })
        .onConflictDoNothing();
    }
  } catch {
    // Gmail not connected
  }

  res.json({
    connected: gmailConnected,
    synced,
    newApplications,
    updatedApplications,
    flaggedScams,
    message: gmailConnected
      ? `Synced ${synced} emails: ${newApplications} new, ${updatedApplications} updated`
      : "Gmail not connected. Connect Gmail to enable automatic sync.",
  });
});

router.get("/gmail/status", async (_req, res) => {
  let connected = false;

  try {
    const { getUncachableGmailClient } = await import("../lib/gmail-client.js").catch(() => ({ getUncachableGmailClient: null }));
    connected = !!getUncachableGmailClient;
  } catch {
    connected = false;
  }

  const syncs = await db
    .select()
    .from(gmailSyncTable)
    .orderBy(desc(gmailSyncTable.lastSyncAt))
    .limit(1);

  const lastSync = syncs[0];

  res.json({
    connected,
    lastSyncAt: lastSync?.lastSyncAt?.toISOString() ?? null,
    totalEmailsProcessed: lastSync?.totalEmailsProcessed ?? 0,
  });
});

export default router;
