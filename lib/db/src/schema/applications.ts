import { pgTable, serial, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationStatusEnum = pgEnum("application_status", [
  "applied",
  "interview",
  "offer",
  "rejected",
  "ghosted",
]);

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  status: applicationStatusEnum("status").notNull().default("applied"),
  source: text("source"),
  location: text("location"),
  notes: text("notes"),
  url: text("url"),
  isScam: boolean("is_scam").notNull().default(false),
  scamReason: text("scam_reason"),
  emailMessageId: text("email_message_id"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
