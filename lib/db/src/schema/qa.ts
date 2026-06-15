import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qaChecksTable = pgTable("qa_checks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  checkType: text("check_type").notNull().default("oedi_rubric"),
  status: text("status").notNull().default("pending"),
  findings: text("findings"),
  remediationNotes: text("remediation_notes"),
  gateBlock: boolean("gate_block").notNull().default(false),
  passedCount: integer("passed_count"),
  failedCount: integer("failed_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQACheckSchema = createInsertSchema(qaChecksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQACheck = z.infer<typeof insertQACheckSchema>;
export type QACheck = typeof qaChecksTable.$inferSelect;
