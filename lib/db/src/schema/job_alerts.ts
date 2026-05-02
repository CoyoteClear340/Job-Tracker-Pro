import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobAlertsTable = pgTable("job_alerts", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  company: text("company"),
  location: text("location"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertJobAlertSchema = createInsertSchema(jobAlertsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertJobAlert = z.infer<typeof insertJobAlertSchema>;
export type JobAlert = typeof jobAlertsTable.$inferSelect;
