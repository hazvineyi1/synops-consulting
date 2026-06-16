import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// Meridian (Provider Operations Portal): provider relations, network-adequacy,
// and dispute/escalation tracking. Sample/seed data only.

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  region: text("region").notNull(),
  networkStatus: text("network_status").notNull().default("In-network"),
  acceptingPatients: boolean("accepting_patients").notNull().default(true),
  panelSize: integer("panel_size").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const networkAdequacyReviewsTable = pgTable("network_adequacy_reviews", {
  id: serial("id").primaryKey(),
  region: text("region").notNull(),
  specialty: text("specialty").notNull(),
  requiredProviders: integer("required_providers").notNull().default(0),
  actualProviders: integer("actual_providers").notNull().default(0),
  status: text("status").notNull().default("Adequate"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerDisputesTable = pgTable("provider_disputes", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id"),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("Contracting"),
  status: text("status").notNull().default("Open"),
  priority: text("priority").notNull().default("Normal"),
  // Append-only list of { author, body, at } note entries.
  notes: jsonb("notes").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProviderRow = typeof providersTable.$inferSelect;
export type NetworkAdequacyReviewRow = typeof networkAdequacyReviewsTable.$inferSelect;
export type ProviderDisputeRow = typeof providerDisputesTable.$inferSelect;
