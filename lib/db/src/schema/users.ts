import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  organization: text("organization"),
  role: text("role").notNull().default("client"),
  // Which product/portal this user belongs to (hub, cadence, rise, compass,
  // meridian, ...). Admins can access every product regardless of this value.
  productKey: text("product_key").notNull().default("hub"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserRow = typeof usersTable.$inferSelect;
