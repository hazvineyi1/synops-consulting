import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, objectivesTable, assessmentsTable, activitiesTable } from "@workspace/db";
import {
  ListObjectivesParams,
  CreateObjectiveParams,
  CreateObjectiveBody,
  UpdateObjectiveParams,
  UpdateObjectiveBody,
  DeleteObjectiveParams,
} from "@workspace/api-zod";

const router = Router();

function parseIds(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as number[];
    return [];
  } catch {
    return [];
  }
}

router.get("/projects/:projectId/objectives", async (req, res): Promise<void> => {
  const params = ListObjectivesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const objectives = await db
    .select()
    .from(objectivesTable)
    .where(eq(objectivesTable.projectId, params.data.projectId))
    .orderBy(objectivesTable.createdAt);

  const assessments = await db.select().from(assessmentsTable);
  const activities = await db.select().from(activitiesTable);

  const result = objectives.map((obj) => {
    const alignedAssessmentCount = assessments.filter((a) =>
      parseIds(a.alignedObjectiveIds).includes(obj.id)
    ).length;
    const alignedActivityCount = activities.filter((a) =>
      parseIds(a.alignedObjectiveIds).includes(obj.id)
    ).length;
    return { ...obj, alignedAssessmentCount, alignedActivityCount };
  });

  res.json(result);
});

router.post("/projects/:projectId/objectives", async (req, res): Promise<void> => {
  const params = CreateObjectiveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateObjectiveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [objective] = await db
    .insert(objectivesTable)
    .values({
      projectId: params.data.projectId,
      level: parsed.data.level,
      text: parsed.data.text,
      parentId: parsed.data.parentId ?? null,
      moduleId: parsed.data.moduleId ?? null,
      masteryEvidence: parsed.data.masteryEvidence ?? null,
      isFlagged: false,
    })
    .returning();

  res.status(201).json({ ...objective, alignedAssessmentCount: 0, alignedActivityCount: 0 });
});

router.patch("/objectives/:id", async (req, res): Promise<void> => {
  const params = UpdateObjectiveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateObjectiveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.level !== undefined) updates.level = parsed.data.level;
  if (parsed.data.text !== undefined) updates.text = parsed.data.text;
  if (parsed.data.parentId !== undefined) updates.parentId = parsed.data.parentId;
  if (parsed.data.moduleId !== undefined) updates.moduleId = parsed.data.moduleId;
  if (parsed.data.masteryEvidence !== undefined) updates.masteryEvidence = parsed.data.masteryEvidence;
  if (parsed.data.isFlagged !== undefined) updates.isFlagged = parsed.data.isFlagged;

  const [objective] = await db
    .update(objectivesTable)
    .set(updates)
    .where(eq(objectivesTable.id, params.data.id))
    .returning();

  if (!objective) {
    res.status(404).json({ error: "Objective not found" });
    return;
  }

  res.json({ ...objective, alignedAssessmentCount: 0, alignedActivityCount: 0 });
});

router.delete("/objectives/:id", async (req, res): Promise<void> => {
  const params = DeleteObjectiveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(objectivesTable)
    .where(eq(objectivesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Objective not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
