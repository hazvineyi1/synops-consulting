import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * A class/section sits under a course and is the most granular allocation target.
 * Tenancy is inherited through course -> project -> client.organization_id.
 */
export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  name: text("name").notNull(),
  section: text("section"),
  term: text("term"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassRow = typeof classesTable.$inferSelect;
