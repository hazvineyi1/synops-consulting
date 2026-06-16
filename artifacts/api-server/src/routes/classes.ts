import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, classesTable, type ClassRow } from "@workspace/db";
import {
  ListClassesParams,
  CreateClassParams,
  CreateClassBody,
  UpdateClassParams,
  UpdateClassBody,
} from "@workspace/api-zod";
import { resolveCourseScope, resolveClassScope, denyNoScope } from "../lib/tenancy";
import { recordActorAudit } from "../lib/audit";

const router = Router();

function classView(row: ClassRow) {
  return {
    id: row.id,
    courseId: row.courseId,
    name: row.name,
    section: row.section,
    term: row.term,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Classes/sections sit under a course; access follows the course scope. A builder
// allocated to the course (or its project) can read and create classes here.
router.get("/courses/:courseId/classes", async (req, res): Promise<void> => {
  const params = ListClassesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const scope = await resolveCourseScope(params.data.courseId);
  if (await denyNoScope(res, req.actor!, scope, "read", "Course not found")) return;

  const rows = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.courseId, params.data.courseId))
    .orderBy(classesTable.createdAt);

  res.json(rows.map(classView));
});

router.post("/courses/:courseId/classes", async (req, res): Promise<void> => {
  const params = CreateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scope = await resolveCourseScope(params.data.courseId);
  if (await denyNoScope(res, req.actor!, scope, "write", "Course not found")) return;

  const [cls] = await db
    .insert(classesTable)
    .values({
      courseId: params.data.courseId,
      name: parsed.data.name.trim(),
      section: parsed.data.section ?? null,
      term: parsed.data.term ?? null,
      status: parsed.data.status ?? "active",
    })
    .returning();

  await recordActorAudit(req.actor!, {
    action: "created",
    entityType: "class",
    entityTitle: cls.name,
    projectId: scope?.projectId ?? null,
  });

  res.status(201).json(classView(cls));
});

router.patch("/classes/:id", async (req, res): Promise<void> => {
  const params = UpdateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const scope = await resolveClassScope(params.data.id);
  if (await denyNoScope(res, req.actor!, scope, "write", "Class not found")) return;

  const updates: Partial<Pick<ClassRow, "name" | "section" | "term" | "status">> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.section !== undefined) updates.section = parsed.data.section;
  if (parsed.data.term !== undefined) updates.term = parsed.data.term;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  let cls: ClassRow;
  if (Object.keys(updates).length === 0) {
    [cls] = await db.select().from(classesTable).where(eq(classesTable.id, params.data.id));
  } else {
    [cls] = await db
      .update(classesTable)
      .set(updates)
      .where(eq(classesTable.id, params.data.id))
      .returning();
  }

  await recordActorAudit(req.actor!, {
    action: "updated",
    entityType: "class",
    entityTitle: cls.name,
    projectId: scope?.projectId ?? null,
  });

  res.json(classView(cls));
});

export default router;
