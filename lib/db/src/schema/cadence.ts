import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

// Cadence (Engagement Command Center) builds on the shared `engagements` table
// as the top-level project, adding milestones and deliverables with QA gates.

export const engagementMilestonesTable = pgTable("engagement_milestones", {
  id: serial("id").primaryKey(),
  engagementId: integer("engagement_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("Pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const engagementDeliverablesTable = pgTable("engagement_deliverables", {
  id: serial("id").primaryKey(),
  engagementId: integer("engagement_id").notNull(),
  milestoneId: integer("milestone_id"),
  title: text("title").notNull(),
  status: text("status").notNull().default("Not started"),
  // QA gate: a deliverable cannot be marked Complete until this is "passed".
  qaGateStatus: text("qa_gate_status").notNull().default("pending"),
  qaNotes: text("qa_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type EngagementMilestoneRow = typeof engagementMilestonesTable.$inferSelect;
export type EngagementDeliverableRow = typeof engagementDeliverablesTable.$inferSelect;
