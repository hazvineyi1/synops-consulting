import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const engagementsTable = pgTable("engagements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  practiceArea: text("practice_area").notNull(),
  status: text("status").notNull().default("Active"),
  nextMilestone: text("next_milestone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalResourcesTable = pgTable("portal_resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EngagementRow = typeof engagementsTable.$inferSelect;
export type PortalResourceRow = typeof portalResourcesTable.$inferSelect;
