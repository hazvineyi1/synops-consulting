import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

// Tables backing the roadmap (scaffolded) products. Kept intentionally small.

// Sentinel (Compliance & Quality Tracker): checklist templates + audit log.
export const sentinelChecklistTemplatesTable = pgTable("sentinel_checklist_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  framework: text("framework").notNull(),
  items: jsonb("items").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sentinelAuditLogTable = pgTable("sentinel_audit_log", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity"),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tend (Care Coordination): intake/workflow ONLY. No PHI or patient data is
// stored here; fields hold synthetic case labels and non-PHI workflow notes.
export const tendIntakesTable = pgTable("tend_intakes", {
  id: serial("id").primaryKey(),
  caseLabel: text("case_label").notNull(),
  riskTier: text("risk_tier").notNull().default("Low"),
  stage: text("stage").notNull().default("Intake"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SentinelChecklistTemplateRow =
  typeof sentinelChecklistTemplatesTable.$inferSelect;
export type SentinelAuditLogRow = typeof sentinelAuditLogTable.$inferSelect;
export type TendIntakeRow = typeof tendIntakesTable.$inferSelect;
