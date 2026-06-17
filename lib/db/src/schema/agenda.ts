import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Project meetings: the per-project Agenda workspace. Each row is one logged
 * meeting with a date/time (`scheduledAt`), free-text `notes`, and a persisted
 * `generatedAgenda` JSON blob for the NEXT meeting (built from open action items,
 * either by the built-in AI or the deterministic rules fallback). `aiProvider`
 * records which path produced the last processing ("openai" | "rules" | null when
 * notes have not been processed yet). Project-scoped: tenancy is resolved through
 * the owning project's client organization (see tenancy.ts).
 */
export const projectMeetingsTable = pgTable("project_meetings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  nextMeetingAt: timestamp("next_meeting_at", { withTimezone: true }),
  generatedAgenda: text("generated_agenda").notNull().default("{}"),
  aiProvider: text("ai_provider"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ProjectMeetingRow = typeof projectMeetingsTable.$inferSelect;

/**
 * Action items tracked off the back of a meeting's notes. `sourceMeetingId` is the
 * meeting whose notes produced the item (nullable so an item can be added by hand).
 * `status` is "open" | "done"; `category` is "general" | "content" | "review" |
 * "accessibility" and drives the accessibility-progress and build-progress signals.
 * `weekIndex` (nullable, zero-based) maps an item to a course week for the weekly
 * build-progress bars. Completing items advances DERIVED progress only; it never
 * mutates the deliberate project stage gates. Project-scoped (see tenancy.ts).
 */
export const meetingActionItemsTable = pgTable("meeting_action_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  sourceMeetingId: integer("source_meeting_id"),
  title: text("title").notNull(),
  description: text("description"),
  ownerName: text("owner_name"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: text("status").notNull().default("open"),
  category: text("category").notNull().default("general"),
  weekIndex: integer("week_index"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type MeetingActionItemRow = typeof meetingActionItemsTable.$inferSelect;
