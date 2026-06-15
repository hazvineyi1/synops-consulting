import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditEventsTable = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityTitle: text("entity_title").notNull(),
  projectTitle: text("project_title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({ id: true, createdAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
