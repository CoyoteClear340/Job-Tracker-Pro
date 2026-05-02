import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { applicationsTable } from "./applications";

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applicationsTable.id, { onDelete: "cascade" }),
  dueAt: timestamp("due_at").notNull(),
  note: text("note"),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Reminder = typeof remindersTable.$inferSelect;
