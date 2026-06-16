import { Router } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  providersTable,
  networkAdequacyReviewsTable,
  providerDisputesTable,
  usersTable,
  type ProviderRow,
  type NetworkAdequacyReviewRow,
  type ProviderDisputeRow,
} from "@workspace/db";
import { requireProduct } from "../lib/auth";

const router = Router();

// Authenticated by the parent router; this additionally scopes access to the
// Meridian product (admins bypass).
const gate = requireProduct("meridian");

interface DisputeNote {
  author: string;
  body: string;
  at: string;
}

const updateSchema = z
  .object({
    status: z.enum(["Open", "In review", "Resolved", "Escalated"]).optional(),
    priority: z.enum(["Low", "Normal", "High", "Urgent"]).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((d) => d.status !== undefined || d.priority !== undefined || d.note !== undefined, {
    message: "Provide at least one field to update.",
  });

function serializeProvider(p: ProviderRow) {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    region: p.region,
    networkStatus: p.networkStatus,
    acceptingPatients: p.acceptingPatients,
    panelSize: p.panelSize,
    createdAt: p.createdAt.toISOString(),
  };
}

function serializeReview(r: NetworkAdequacyReviewRow) {
  return {
    id: r.id,
    region: r.region,
    specialty: r.specialty,
    requiredProviders: r.requiredProviders,
    actualProviders: r.actualProviders,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

function readNotes(raw: unknown): DisputeNote[] {
  return Array.isArray(raw) ? (raw as DisputeNote[]) : [];
}

function serializeDispute(d: ProviderDisputeRow) {
  return {
    id: d.id,
    providerId: d.providerId,
    subject: d.subject,
    category: d.category,
    status: d.status,
    priority: d.priority,
    notes: readNotes(d.notes),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

async function actingUserName(userId: number): Promise<string> {
  const [u] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.name ?? "Operations";
}

// List network providers (synthetic seed data).
router.get("/meridian/providers", gate, async (_req, res): Promise<void> => {
  const rows = await db.select().from(providersTable).orderBy(asc(providersTable.name));
  res.json(rows.map(serializeProvider));
});

// List network-adequacy reviews by region/specialty.
router.get("/meridian/network-adequacy", gate, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(networkAdequacyReviewsTable)
    .orderBy(asc(networkAdequacyReviewsTable.region), asc(networkAdequacyReviewsTable.specialty));
  res.json(rows.map(serializeReview));
});

// List the dispute / escalation queue, most recently updated first.
router.get("/meridian/disputes", gate, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(providerDisputesTable)
    .orderBy(desc(providerDisputesTable.updatedAt));
  res.json(rows.map(serializeDispute));
});

// Update a dispute's status/priority and optionally append a note.
router.patch("/meridian/disputes/:id", gate, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid dispute id" });
    return;
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [existing] = await db
    .select()
    .from(providerDisputesTable)
    .where(eq(providerDisputesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Dispute not found" });
    return;
  }

  const update: Partial<typeof providerDisputesTable.$inferInsert> = {};
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.priority !== undefined) update.priority = parsed.data.priority;
  if (parsed.data.note !== undefined) {
    const author = await actingUserName(req.session.userId!);
    const notes = readNotes(existing.notes);
    notes.push({ author, body: parsed.data.note, at: new Date().toISOString() });
    update.notes = notes;
  }

  const [row] = await db
    .update(providerDisputesTable)
    .set(update)
    .where(eq(providerDisputesTable.id, id))
    .returning();
  res.json(serializeDispute(row));
});

export default router;
