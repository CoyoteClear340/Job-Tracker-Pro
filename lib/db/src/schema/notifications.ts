import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { jobAlertsTable } from "./job_alerts";
import { applicationsTable } from "./applications";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => jobAlertsTable.id, { onDelete: "cascade" }),
  applicationId: integer("application_id").references(() => applicationsTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
