import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  // Legacy free-text affiliation (display only). The tenant boundary is
  // `organizationId` below.
  organization: text("organization"),
  // Tenant binding for curriculum (Compass) actors. Nullable because most
  // product users (Hub/Cadence/Rise/Meridian) are not curriculum tenants.
  // school_admin/builder MUST have one; admin/super_admin are global.
  organizationId: integer("organization_id"),
  role: text("role").notNull().default("client"),
  // Which product/portal this user belongs to (hub, cadence, rise, compass,
  // meridian, ...). Admins can access every product regardless of this value.
  productKey: text("product_key").notNull().default("hub"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserRow = typeof usersTable.$inferSelect;
