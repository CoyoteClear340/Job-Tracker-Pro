import { db, gmailSyncTable, applicationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { gmail_v1 } from "googleapis";
import { logger } from "./logger";
import { getUncachableGmailClient, isGmailConfigured } from "./gmail-client";

const UNKNOWN_ROLE = "Unknown Role";

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

// Best-effort role/title extraction from common ATS phrasing (Greenhouse, Lever, Workday, etc.)
const ROLE_PATTERNS: RegExp[] = [
  /for the\s+([A-Za-z0-9][\w\s\-/&,.]{1,60}?)\s+(?:position|role|opening|internship)/i,
  /applying (?:for|to)(?: the)?\s+([A-Za-z0-9][\w\s\-/&,.]{1,60}?)\s+(?:position|role|internship|job)\b/i,
  /application (?:for|to)\s+(?:the\s+)?([A-Za-z0-9][\w\s\-/&,.]{1,60}?)\s+(?:position|role|at|@)/i,
  /your application for\s+([A-Za-z0-9][\w\s\-/&,.]{1,60}?)(?:\s+at\b|\s*[-–—]|$)/im,
  /position of\s+([A-Za-z0-9][\w\s\-/&,.]{1,60}?)(?:\s+at\b|[.,]|$)/i,
];

function detectStatus(subject: string, body: string): "applied" | "interview" | "rejected" | "offer" {
  const text = `${subject} ${body}`;
  if (OFFER_PATTERNS.some((p) => p.test(text))) return "offer";
  if (INTERVIEW_PATTERNS.some((p) => p.test(text))) return "interview";
  if (REJECTION_PATTERNS.some((p) => p.test(text))) return "rejected";
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

function extractRole(subject: string, body: string): string | null {
  const text = `${subject}\n${body}`;
  for (const pattern of ROLE_PATTERNS) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim().replace(/\s+/g, " ");
    if (candidate && candidate.length >= 2 && candidate.length <= 80) {
      return candidate;
    }
  }
  return null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  const collect = (part: gmail_v1.Schema$MessagePart): { plain: string; html: string } => {
    let plain = "";
    let html = "";

    if (part.mimeType === "text/plain" && part.body?.data) {
      plain += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }

    for (const child of part.parts ?? []) {
      const nested = collect(child);
      plain += nested.plain;
      html += nested.html;
    }

    return { plain, html };
  };

  const { plain, html } = collect(payload);
  if (plain.trim()) return plain;
  if (html.trim()) return stripHtml(html);
  return "";
}

export interface GmailSyncResult {
  connected: boolean;
  synced: number;
  newApplications: number;
  updatedApplications: number;
  flaggedScams: number;
  message: string;
}

export async function syncGmail(options?: { days?: number; maxResults?: number }): Promise<GmailSyncResult> {
  if (!isGmailConfigured()) {
    return {
      connected: false,
      synced: 0,
      newApplications: 0,
      updatedApplications: 0,
      flaggedScams: 0,
      message: "Gmail not connected. Connect Gmail to enable automatic sync.",
    };
  }

  const days = options?.days ?? 7;
  const maxResults = options?.maxResults ?? 50;

  let synced = 0;
  let newApplications = 0;
  let updatedApplications = 0;
  let flaggedScams = 0;

  try {
    const gmail = await getUncachableGmailClient();

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: `newer_than:${days}d`,
    });

    const messages = listResponse.data.messages ?? [];
    synced = messages.length;

    for (const msg of messages) {
      if (!msg.id) continue;

      const msgData = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = msgData.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const body = extractBody(msgData.data.payload ?? undefined) || msgData.data.snippet || "";

      const isJobRelated =
        APPLICATION_PATTERNS.some((p) => p.test(`${subject} ${body}`)) ||
        INTERVIEW_PATTERNS.some((p) => p.test(`${subject} ${body}`)) ||
        REJECTION_PATTERNS.some((p) => p.test(`${subject} ${body}`)) ||
        OFFER_PATTERNS.some((p) => p.test(`${subject} ${body}`));

      if (!isJobRelated) continue;

      const emailMatch = from.match(/@([^.>]+)/);
      const company = emailMatch ? emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1) : "Unknown Company";
      const role = extractRole(subject, body) ?? UNKNOWN_ROLE;

      const status = detectStatus(subject, body);
      const { isScam, reason } = detectScam(subject, body);
      if (isScam) flaggedScams++;

      const existing = await db
        .select()
        .from(applicationsTable)
        .where(eq(applicationsTable.emailMessageId, msg.id))
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0]!;
        const updates: Partial<typeof applicationsTable.$inferInsert> = {};

        if (current.status !== status) updates.status = status;
        // Backfill a real role if the original sync couldn't extract one
        if (current.role === UNKNOWN_ROLE && role !== UNKNOWN_ROLE) updates.role = role;

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await db.update(applicationsTable).set(updates).where(eq(applicationsTable.id, current.id));
          updatedApplications++;
        }
      } else {
        await db.insert(applicationsTable).values({
          company,
          role,
          status,
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

    await db
      .insert(gmailSyncTable)
      .values({ lastSyncAt: new Date(), totalEmailsProcessed: synced })
      .onConflictDoNothing();

    return {
      connected: true,
      synced,
      newApplications,
      updatedApplications,
      flaggedScams,
      message: `Synced ${synced} emails: ${newApplications} new, ${updatedApplications} updated`,
    };
  } catch (err) {
    logger.error({ err }, "Gmail sync failed");
    return {
      connected: true,
      synced,
      newApplications,
      updatedApplications,
      flaggedScams,
      message: `Gmail sync failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function startGmailSyncScheduler(intervalMs = 15 * 60 * 1000): ReturnType<typeof setInterval> | undefined {
  if (!isGmailConfigured()) {
    logger.info("Gmail sync scheduler not started: Gmail is not configured");
    return undefined;
  }

  logger.info({ intervalMs }, "Gmail sync scheduler started");

  syncGmail()
    .then((result) => logger.info(result, "Initial Gmail sync complete"))
    .catch((err) => logger.error({ err }, "Initial Gmail sync failed"));

  return setInterval(() => {
    syncGmail()
      .then((result) => logger.info(result, "Scheduled Gmail sync complete"))
      .catch((err) => logger.error({ err }, "Scheduled Gmail sync failed"));
  }, intervalMs);
}
