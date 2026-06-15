import { Router } from "express";
import { count, eq, desc } from "drizzle-orm";
import { db, projectsTable, clientsTable, auditEventsTable } from "@workspace/db";

const router = Router();

const STAGE_LABELS = [
  "Kickoff & Intake",
  "Backward Design",
  "Prototype",
  "Production",
  "QA & Accessibility",
  "Handoff",
];

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const [{ total: totalClients }] = await db
    .select({ total: count() })
    .from(clientsTable);

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

router.get("/dashboard/activity", async (_req, res): Promise<void> => {
  const events = await db
    .select()
    .from(auditEventsTable)
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
