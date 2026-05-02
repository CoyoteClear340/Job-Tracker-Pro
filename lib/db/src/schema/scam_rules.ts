import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ruleTypeEnum = pgEnum("rule_type", ["builtin", "custom"]);

export const scamRulesTable = pgTable("scam_rules", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  description: text("description").notNull(),
  ruleType: ruleTypeEnum("rule_type").notNull().default("custom"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScamRuleSchema = createInsertSchema(scamRulesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertScamRule = z.infer<typeof insertScamRuleSchema>;
export type ScamRule = typeof scamRulesTable.$inferSelect;
