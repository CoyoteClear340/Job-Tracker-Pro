import { Router } from "express";
import { db, gmailSyncTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { syncGmail } from "../lib/gmail-sync";
import { isGmailConfigured } from "../lib/gmail-client";

const router = Router();

router.post("/gmail/sync", async (_req, res) => {
  const result = await syncGmail();
  res.json(result);
});

router.get("/gmail/status", async (_req, res) => {
  const syncs = await db
    .select()
    .from(gmailSyncTable)
    .orderBy(desc(gmailSyncTable.lastSyncAt))
    .limit(1);

  const lastSync = syncs[0];

  res.json({
    connected: isGmailConfigured(),
    lastSyncAt: lastSync?.lastSyncAt?.toISOString() ?? null,
    totalEmailsProcessed: lastSync?.totalEmailsProcessed ?? 0,
  });
});

export default router;
