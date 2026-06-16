import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, coursesTable, modulesTable } from "@workspace/db";
import {
  ListCoursesParams,
  CreateCourseParams,
  CreateCourseBody,
  GetCourseParams,
  UpdateCourseParams,
  UpdateCourseBody,
  ListModulesParams,
  CreateModuleParams,
  CreateModuleBody,
  UpdateModuleParams,
  UpdateModuleBody,
  DeleteModuleParams,
} from "@workspace/api-zod";
import {
  denyCrossOrg,
  getCourseOrgId,
  getModuleOrgId,
  getProjectOrgId,
} from "../lib/tenancy";

const router = Router();

// Courses
router.get("/projects/:projectId/courses", async (req, res): Promise<void> => {
  const params = ListCoursesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getProjectOrgId(params.data.projectId), "Project not found")) {
    return;
  }

  const courses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.projectId, params.data.projectId))
    .orderBy(coursesTable.createdAt);

  res.json(courses);
});

router.post("/projects/:projectId/courses", async (req, res): Promise<void> => {
  const params = CreateCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getProjectOrgId(params.data.projectId), "Project not found")) {
    return;
  }

  const [course] = await db
    .insert(coursesTable)
    .values({
      projectId: params.data.projectId,
      title: parsed.data.title,
      creditHours: parsed.data.creditHours ?? null,
      termWeeks: parsed.data.termWeeks ?? null,
      moduleCount: parsed.data.moduleCount ?? null,
      modality: parsed.data.modality ?? null,
      accreditors: parsed.data.accreditors ?? null,
      seatTimeHours: parsed.data.seatTimeHours ?? null,
      courseDescription: parsed.data.courseDescription ?? null,
    })
    .returning();

  res.status(201).json(course);
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const params = GetCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getCourseOrgId(params.data.id), "Course not found")) return;

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, params.data.id));

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json(course);
});

router.patch("/courses/:id", async (req, res): Promise<void> => {
  const params = UpdateCourseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getCourseOrgId(params.data.id), "Course not found")) return;

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.creditHours !== undefined) updates.creditHours = parsed.data.creditHours;
  if (parsed.data.termWeeks !== undefined) updates.termWeeks = parsed.data.termWeeks;
  if (parsed.data.moduleCount !== undefined) updates.moduleCount = parsed.data.moduleCount;
  if (parsed.data.modality !== undefined) updates.modality = parsed.data.modality;
  if (parsed.data.accreditors !== undefined) updates.accreditors = parsed.data.accreditors;
  if (parsed.data.seatTimeHours !== undefined) updates.seatTimeHours = parsed.data.seatTimeHours;
  if (parsed.data.courseDescription !== undefined) updates.courseDescription = parsed.data.courseDescription;

  const [course] = await db
    .update(coursesTable)
    .set(updates)
    .where(eq(coursesTable.id, params.data.id))
    .returning();

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json(course);
});

// Modules
router.get("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const params = ListModulesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getCourseOrgId(params.data.courseId), "Course not found")) {
    return;
  }

  const modules = await db
    .select()
    .from(modulesTable)
    .where(eq(modulesTable.courseId, params.data.courseId))
    .orderBy(modulesTable.position);

  res.json(modules);
});

router.post("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const params = CreateModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateModuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getCourseOrgId(params.data.courseId), "Course not found")) {
    return;
  }

  const [module] = await db
    .insert(modulesTable)
    .values({
      courseId: params.data.courseId,
      title: parsed.data.title,
      position: parsed.data.position,
      weekNumber: parsed.data.weekNumber ?? null,
      description: parsed.data.description ?? null,
      isPrototype: parsed.data.isPrototype ?? false,
      status: "draft",
    })
    .returning();

  res.status(201).json(module);
});

router.patch("/modules/:id", async (req, res): Promise<void> => {
  const params = UpdateModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateModuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getModuleOrgId(params.data.id), "Module not found")) return;

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;
  if (parsed.data.weekNumber !== undefined) updates.weekNumber = parsed.data.weekNumber;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.isPrototype !== undefined) updates.isPrototype = parsed.data.isPrototype;

  const [module] = await db
    .update(modulesTable)
    .set(updates)
    .where(eq(modulesTable.id, params.data.id))
    .returning();

  if (!module) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  res.json(module);
});

router.delete("/modules/:id", async (req, res): Promise<void> => {
  const params = DeleteModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getModuleOrgId(params.data.id), "Module not found")) return;

  const [deleted] = await db
    .delete(modulesTable)
    .where(eq(modulesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
