import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Meeting recordings attached to a project's intake/kickoff. A row is either an
 * in-browser capture uploaded to object storage (`kind = "upload"`, carries
 * `objectPath`) or an external link to a recording held elsewhere
 * (`kind = "external"`, carries `externalUrl`). Project-scoped: tenancy is
 * resolved through the owning project's client organization (see tenancy.ts).
 */
export const meetingRecordingsTable = pgTable("meeting_recordings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  kind: text("kind").notNull(), // "upload" | "external"
  title: text("title").notNull(),
  objectPath: text("object_path"),
  externalUrl: text("external_url"),
  durationSec: integer("duration_sec"),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type MeetingRecordingRow = typeof meetingRecordingsTable.$inferSelect;
