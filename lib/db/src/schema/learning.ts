import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

// Rise (Adaptive Learning Platform) persists each completed adaptive run.
// userId is nullable so anonymous runs can be stored too.

export const learningSessionsTable = pgTable("learning_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  productKey: text("product_key").notNull().default("rise"),
  level: text("level").notNull(),
  itemsAttempted: integer("items_attempted").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  masteryEstimate: integer("mastery_estimate").notNull().default(0),
  finalRung: text("final_rung"),
  path: jsonb("path").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LearningSessionRow = typeof learningSessionsTable.$inferSelect;
