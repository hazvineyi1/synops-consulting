import { Router } from "express";
import { count, eq, desc } from "drizzle-orm";
import { db, projectsTable, clientsTable, auditEventsTable } from "@workspace/db";
import { clientOrgFilter } from "../lib/tenancy";

const router = Router();

const STAGE_LABELS = [
  "Kickoff & Intake",
  "Backward Design",
  "Prototype",
  "Production",
  "QA & Accessibility",
  "Handoff",
];

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const actor = req.actor!;

  // Project metrics scoped to the actor's organization (global actors see all).
  const projectCols = {
    status: projectsTable.status,
    stage: projectsTable.stage,
    targetDeliveryDate: projectsTable.targetDeliveryDate,
  };
  const projects = actor.isGlobal
    ? await db.select(projectCols).from(projectsTable)
    : await db
        .select(projectCols)
        .from(projectsTable)
        .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
        .where(eq(clientsTable.organizationId, actor.organizationId!));

  const [{ total: totalClients }] = await db
    .select({ total: count() })
    .from(clientsTable)
    .where(clientOrgFilter(actor));

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const gateBlockedCount = projects.filter((p) => p.status === "gate_blocked").length;

  const now = new Date();
  const overdueCount = projects.filter((p) => {
    if (!p.targetDeliveryDate) return false;
    return new Date(p.targetDeliveryDate) < now && p.status !== "complete";
  }).length;

  const stageMap = new Map<number, number>();
  for (const p of projects) {
    stageMap.set(p.stage, (stageMap.get(p.stage) ?? 0) + 1);
  }

  const projectsByStage = STAGE_LABELS.map((label, idx) => ({
    stage: idx,
    label,
    count: stageMap.get(idx) ?? 0,
  }));

  res.json({
    totalProjects: projects.length,
    activeProjects,
    projectsByStage,
    totalClients: Number(totalClients),
    gateBlockedCount,
    overdueCount,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const actor = req.actor!;

  const eventCols = {
    id: auditEventsTable.id,
    projectId: auditEventsTable.projectId,
    projectTitle: auditEventsTable.projectTitle,
    action: auditEventsTable.action,
    entityType: auditEventsTable.entityType,
    entityTitle: auditEventsTable.entityTitle,
    createdAt: auditEventsTable.createdAt,
  };

  // Non-global actors only see audit events tied to their org's projects.
  const events = actor.isGlobal
    ? await db
        .select(eventCols)
        .from(auditEventsTable)
        .orderBy(desc(auditEventsTable.createdAt))
        .limit(20)
    : await db
        .select(eventCols)
        .from(auditEventsTable)
        .innerJoin(projectsTable, eq(auditEventsTable.projectId, projectsTable.id))
        .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
        .where(eq(clientsTable.organizationId, actor.organizationId!))
        .orderBy(desc(auditEventsTable.createdAt))
        .limit(20);

  res.json(
    events.map((e) => ({
      id: e.id,
      projectId: e.projectId ?? 0,
      projectTitle: e.projectTitle ?? "Unknown Project",
      action: e.action,
      entityType: e.entityType,
      entityTitle: e.entityTitle,
      timestamp: e.createdAt.toISOString(),
    }))
  );
});

export default router;
