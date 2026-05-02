import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const gmailSyncTable = pgTable("gmail_sync", {
  id: serial("id").primaryKey(),
  lastSyncAt: timestamp("last_sync_at"),
  totalEmailsProcessed: integer("total_emails_processed").notNull().default(0),
});

export type GmailSync = typeof gmailSyncTable.$inferSelect;
