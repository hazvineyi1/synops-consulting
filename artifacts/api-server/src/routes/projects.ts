import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  projectsTable,
  clientsTable,
  coursesTable,
  objectivesTable,
  assessmentsTable,
  qaChecksTable,
  auditEventsTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  AdvanceProjectStageParams,
  AdvanceProjectStageBody,
  GetProjectGateStatusParams,
} from "@workspace/api-zod";

const router = Router();

const STAGE_LABELS = [
  "Kickoff & Intake",
  "Backward Design",
  "Prototype",
  "Production",
  "QA & Accessibility",
  "Handoff",
];

async function projectWithClient(project: typeof projectsTable.$inferSelect) {
  const [client] = await db
    .select({ name: clientsTable.name })
    .from(clientsTable)
    .where(eq(clientsTable.id, project.clientId));
  return { ...project, clientName: client?.name ?? null };
}

router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt));

  const clients = await db.select().from(clientsTable);
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const result = projects.map((p) => ({
    ...p,
    clientName: clientMap.get(p.clientId) ?? null,
  }));

  res.json(result);
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      tier: parsed.data.tier ?? null,
      modality: parsed.data.modality ?? null,
      targetDeliveryDate: parsed.data.targetDeliveryDate ?? null,
      stage: 0,
      status: "active",
    })
    .returning();

  await db.insert(auditEventsTable).values({
    projectId: project.id,
    action: "created",
    entityType: "project",
    entityTitle: project.title,
    projectTitle: project.title,
  });

  const result = await projectWithClient(project);
  res.status(201).json(result);
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const result = await projectWithClient(project);
  res.json(result);
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.tier !== undefined) updates.tier = parsed.data.tier;
  if (parsed.data.modality !== undefined) updates.modality = parsed.data.modality;
  if (parsed.data.targetDeliveryDate !== undefined) updates.targetDeliveryDate = parsed.data.targetDeliveryDate;

  const [project] = await db
    .update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const result = await projectWithClient(project);
  res.json(result);
});

router.post("/projects/:id/advance-stage", async (req, res): Promise<void> => {
  const params = AdvanceProjectStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdvanceProjectStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.stage >= 5) {
    res.status(400).json({ error: "Project is already at final stage" });
    return;
  }

  const newStage = project.stage + 1;

  const [updated] = await db
    .update(projectsTable)
    .set({ stage: newStage })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  await db.insert(auditEventsTable).values({
    projectId: project.id,
    action: `advanced to stage ${newStage}: ${STAGE_LABELS[newStage]}`,
    entityType: "project",
    entityTitle: project.title,
    projectTitle: project.title,
  });

  await db.insert(auditEventsTable).values({
    projectId: project.id,
    action: parsed.data.notes,
    entityType: "stage_note",
    entityTitle: STAGE_LABELS[newStage] ?? "Stage",
    projectTitle: project.title,
  });

  const result = await projectWithClient(updated);
  res.json(result);
});

router.get("/projects/:id/gate-status", async (req, res): Promise<void> => {
  const params = GetProjectGateStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const courses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.projectId, project.id));

  const objectives = await db
    .select()
    .from(objectivesTable)
    .where(eq(objectivesTable.projectId, project.id));

  const unflaggedObjectives = objectives.filter((o) => !o.isFlagged);

  const blockedQA = await db
    .select()
    .from(qaChecksTable)
    .where(eq(qaChecksTable.projectId, project.id));

  const hasBlockingFail = blockedQA.some(
    (q) => q.gateBlock && q.status === "fail"
  );

  const requirementSets: Record<number, Array<{ label: string; met: boolean; blocking: boolean; detail: string | null }>> = {
    0: [
      {
        label: "At least one course defined",
        met: courses.length > 0,
        blocking: true,
        detail: courses.length > 0 ? null : "Add a course in the Intake tab",
      },
      {
        label: "Course learning objectives entered",
        met: unflaggedObjectives.length > 0,
        blocking: true,
        detail: unflaggedObjectives.length > 0 ? null : "Add at least one objective",
      },
    ],
    1: [
      {
        label: "Assessments aligned to objectives",
        met: unflaggedObjectives.length > 0,
        blocking: true,
        detail: null,
      },
    ],
    2: [
      {
        label: "Prototype module approved",
        met: courses.length > 0,
        blocking: true,
        detail: null,
      },
    ],
    3: [
      {
        label: "All modules in production",
        met: true,
        blocking: false,
        detail: null,
      },
    ],
    4: [
      {
        label: "No blocking QA failures",
        met: !hasBlockingFail,
        blocking: true,
        detail: hasBlockingFail ? "Resolve blocking QA findings before handoff" : null,
      },
    ],
    5: [
      {
        label: "Evidence Ledger complete",
        met: true,
        blocking: false,
        detail: null,
      },
    ],
  };

  const requirements = requirementSets[project.stage] ?? [];
  const canAdvance = project.stage < 5 && requirements.every((r) => !r.blocking || r.met);

  res.json({
    stage: project.stage,
    canAdvance,
    requirements,
  });
});

export default router;
