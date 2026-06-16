import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const contactSubmissionsTable = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization"),
  email: text("email").notNull(),
  phone: text("phone"),
  areaOfInterest: text("area_of_interest").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull().default("contact"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSignupsTable = pgTable("newsletter_signups", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const demoSessionsTable = pgTable("demo_sessions", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  itemsAttempted: integer("items_attempted").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  masteryEstimate: integer("mastery_estimate").notNull().default(0),
  finalRung: text("final_rung"),
  path: jsonb("path").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ContactSubmissionRow = typeof contactSubmissionsTable.$inferSelect;
export type NewsletterSignupRow = typeof newsletterSignupsTable.$inferSelect;
export type DemoSessionRow = typeof demoSessionsTable.$inferSelect;
