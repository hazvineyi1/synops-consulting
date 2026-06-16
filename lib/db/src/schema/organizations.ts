import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Organizations are the tenant boundary for the curriculum (Compass) platform.
 * `type` distinguishes the consulting firm's own tenant ("internal") from an
 * external, white-labeled school tenant ("school"). The curriculum tree roots at
 * `clients.organization_id`; everything below inherits tenancy through it.
 */
export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("school"),
  // Optional white-label branding. Used to theme a tenant's surfaces; never used
  // for authorization. Host/DNS resolution is a later task.
  accentColor: text("accent_color"),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  domain: text("domain"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
