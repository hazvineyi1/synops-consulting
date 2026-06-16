import { Router } from "express";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  engagementsTable,
  engagementMilestonesTable,
  engagementDeliverablesTable,
  usersTable,
  type EngagementRow,
  type EngagementMilestoneRow,
  type EngagementDeliverableRow,
} from "@workspace/db";
import { requireProduct } from "../lib/auth";

const router = Router();

// Authenticated by the parent router; this additionally scopes access to the
// Cadence product (admins bypass).
const gate = requireProduct("cadence");

const DONE_STATUS = "Complete";

const deliverableUpdateSchema = z.object({
  status: z.string().min(1).max(60).optional(),
  qaGateStatus: z.enum(["pending", "passed", "failed"]).optional(),
  qaNotes: z.string().max(2000).optional(),
});

const milestoneUpdateSchema = z.object({
  status: z.string().min(1).max(60),
});

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

async function isAdmin(userId: number): Promise<boolean> {
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

function serializeEngagement(
  e: EngagementRow,
  milestoneCount: number,
  deliverableCount: number,
  completedDeliverableCount: number,
) {
  return {
    id: e.id,
    userId: e.userId,
    title: e.title,
    practiceArea: e.practiceArea,
    status: e.status,
    nextMilestone: e.nextMilestone,
    description: e.description,
    dueDate: iso(e.dueDate),
    createdAt: e.createdAt.toISOString(),
    milestoneCount,
    deliverableCount,
    completedDeliverableCount,
  };
}

function serializeMilestone(m: EngagementMilestoneRow) {
  return {
    id: m.id,
    engagementId: m.engagementId,
    title: m.title,
    status: m.status,
    dueDate: iso(m.dueDate),
    orderIndex: m.orderIndex,
    createdAt: m.createdAt.toISOString(),
  };
}

function serializeDeliverable(d: EngagementDeliverableRow) {
  return {
    id: d.id,
    engagementId: d.engagementId,
    milestoneId: d.milestoneId,
    title: d.title,
    status: d.status,
    qaGateStatus: d.qaGateStatus,
    qaNotes: d.qaNotes,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/cadence/engagements", gate, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const admin = await isAdmin(userId);

  const engagements = admin
    ? await db.select().from(engagementsTable).orderBy(desc(engagementsTable.createdAt))
    : await db
        .select()
        .from(engagementsTable)
        .where(eq(engagementsTable.userId, userId))
        .orderBy(desc(engagementsTable.createdAt));

  const ids = engagements.map((e) => e.id);
  const milestones = ids.length
    ? await db
        .select()
        .from(engagementMilestonesTable)
        .where(inArray(engagementMilestonesTable.engagementId, ids))
    : [];
  const deliverables = ids.length
    ? await db
        .select()
        .from(engagementDeliverablesTable)
        .where(inArray(engagementDeliverablesTable.engagementId, ids))
    : [];

  res.json(
    engagements.map((e) => {
      const m = milestones.filter((x) => x.engagementId === e.id);
      const d = deliverables.filter((x) => x.engagementId === e.id);
      return serializeEngagement(
        e,
        m.length,
        d.length,
        d.filter((x) => x.status === DONE_STATUS).length,
      );
    }),
  );
});

router.get("/cadence/engagements/:id", gate, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [engagement] = await db
    .select()
    .from(engagementsTable)
    .where(eq(engagementsTable.id, id));
  if (!engagement) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const userId = req.session.userId!;
  const admin = await isAdmin(userId);
  if (!admin && engagement.userId !== userId) {
    res.status(403).json({ error: "You do not have access to this engagement." });
    return;
  }

  const milestones = await db
    .select()
    .from(engagementMilestonesTable)
    .where(eq(engagementMilestonesTable.engagementId, id))
    .orderBy(asc(engagementMilestonesTable.orderIndex), asc(engagementMilestonesTable.id));
  const deliverables = await db
    .select()
    .from(engagementDeliverablesTable)
    .where(eq(engagementDeliverablesTable.engagementId, id))
    .orderBy(asc(engagementDeliverablesTable.id));

  res.json({
    engagement: serializeEngagement(
      engagement,
      milestones.length,
      deliverables.length,
      deliverables.filter((d) => d.status === DONE_STATUS).length,
    ),
    milestones: milestones.map(serializeMilestone),
    deliverables: deliverables.map(serializeDeliverable),
  });
});

router.patch("/cadence/deliverables/:id", gate, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const parsed = deliverableUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [deliverable] = await db
    .select()
    .from(engagementDeliverablesTable)
    .where(eq(engagementDeliverablesTable.id, id));
  if (!deliverable) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [engagement] = await db
    .select()
    .from(engagementsTable)
    .where(eq(engagementsTable.id, deliverable.engagementId));
  const userId = req.session.userId!;
  const admin = await isAdmin(userId);
  if (!engagement || (!admin && engagement.userId !== userId)) {
    res.status(403).json({ error: "You do not have access to this deliverable." });
    return;
  }

  const next = parsed.data;

  // QA gate: a deliverable cannot be completed until its gate has passed
  // (either already passed, or being set to passed in the same request).
  const effectiveGate = next.qaGateStatus ?? deliverable.qaGateStatus;
  if (next.status === DONE_STATUS && effectiveGate !== "passed") {
    res.status(400).json({
      error: "The QA gate must pass before this deliverable can be completed.",
    });
    return;
  }

  const updates: Partial<{
    status: string;
    qaGateStatus: string;
    qaNotes: string | null;
  }> = {};
  if (next.status !== undefined) updates.status = next.status;
  if (next.qaGateStatus !== undefined) updates.qaGateStatus = next.qaGateStatus;
  if (next.qaNotes !== undefined) updates.qaNotes = next.qaNotes;

  if (Object.keys(updates).length === 0) {
    res.json(serializeDeliverable(deliverable));
    return;
  }

  const [updated] = await db
    .update(engagementDeliverablesTable)
    .set(updates)
    .where(eq(engagementDeliverablesTable.id, id))
    .returning();
  res.json(serializeDeliverable(updated));
});

router.patch("/cadence/milestones/:id", gate, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const parsed = milestoneUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [milestone] = await db
    .select()
    .from(engagementMilestonesTable)
    .where(eq(engagementMilestonesTable.id, id));
  if (!milestone) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [engagement] = await db
    .select()
    .from(engagementsTable)
    .where(eq(engagementsTable.id, milestone.engagementId));
  const userId = req.session.userId!;
  const admin = await isAdmin(userId);
  if (!engagement || (!admin && engagement.userId !== userId)) {
    res.status(403).json({ error: "You do not have access to this milestone." });
    return;
  }

  const [updated] = await db
    .update(engagementMilestonesTable)
    .set({ status: parsed.data.status })
    .where(eq(engagementMilestonesTable.id, id))
    .returning();
  res.json(serializeMilestone(updated));
});

export default router;
