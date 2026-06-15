import { Router } from "express";
import { eq, count } from "drizzle-orm";
import {
  db,
  standardsFrameworksTable,
  standardCompetenciesTable,
  crosswalkLinksTable,
} from "@workspace/db";
import {
  CreateStandardsFrameworkBody,
  ListCompetenciesParams,
  CreateCompetencyParams,
  CreateCompetencyBody,
  ListCrosswalkLinksParams,
  CreateCrosswalkLinkParams,
  CreateCrosswalkLinkBody,
  DeleteCrosswalkLinkParams,
  GetCrosswalkGapsParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/standards-frameworks", async (_req, res): Promise<void> => {
  const frameworks = await db
    .select()
    .from(standardsFrameworksTable)
    .orderBy(standardsFrameworksTable.name);

  const competencyCounts = await db
    .select({ frameworkId: standardCompetenciesTable.frameworkId, count: count() })
    .from(standardCompetenciesTable)
    .groupBy(standardCompetenciesTable.frameworkId);

  const countMap = new Map(competencyCounts.map((r) => [r.frameworkId, Number(r.count)]));

  const result = frameworks.map((f) => ({
    ...f,
    competencyCount: countMap.get(f.id) ?? 0,
  }));

  res.json(result);
});

router.post("/standards-frameworks", async (req, res): Promise<void> => {
  const parsed = CreateStandardsFrameworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [framework] = await db
    .insert(standardsFrameworksTable)
    .values({
      name: parsed.data.name,
      acronym: parsed.data.acronym ?? null,
      frameworkType: parsed.data.frameworkType,
      description: parsed.data.description ?? null,
    })
    .returning();

  res.status(201).json({ ...framework, competencyCount: 0 });
});

router.get("/standards-frameworks/:id/competencies", async (req, res): Promise<void> => {
  const params = ListCompetenciesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const competencies = await db
    .select()
    .from(standardCompetenciesTable)
    .where(eq(standardCompetenciesTable.frameworkId, params.data.id))
    .orderBy(standardCompetenciesTable.code);

  res.json(competencies);
});

router.post("/standards-frameworks/:id/competencies", async (req, res): Promise<void> => {
  const params = CreateCompetencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCompetencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [competency] = await db
    .insert(standardCompetenciesTable)
    .values({
      frameworkId: params.data.id,
      code: parsed.data.code,
      description: parsed.data.description,
      domain: parsed.data.domain ?? null,
    })
    .returning();

  res.status(201).json(competency);
});

router.get("/projects/:projectId/crosswalk", async (req, res): Promise<void> => {
  const params = ListCrosswalkLinksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const links = await db
    .select()
    .from(crosswalkLinksTable)
    .where(eq(crosswalkLinksTable.projectId, params.data.projectId))
    .orderBy(crosswalkLinksTable.createdAt);

  const competencies = await db.select().from(standardCompetenciesTable);
  const competencyMap = new Map(competencies.map((c) => [c.id, c]));

  const result = links.map((l) => {
    const competency = competencyMap.get(l.competencyId);
    return {
      ...l,
      competencyCode: competency?.code ?? null,
      competencyDescription: competency?.description ?? null,
    };
  });

  res.json(result);
});

router.post("/projects/:projectId/crosswalk", async (req, res): Promise<void> => {
  const params = CreateCrosswalkLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateCrosswalkLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [link] = await db
    .insert(crosswalkLinksTable)
    .values({
      projectId: params.data.projectId,
      competencyId: parsed.data.competencyId,
      objectiveId: parsed.data.objectiveId ?? null,
      assessmentId: parsed.data.assessmentId ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  const [competency] = await db
    .select()
    .from(standardCompetenciesTable)
    .where(eq(standardCompetenciesTable.id, link.competencyId));

  res.status(201).json({
    ...link,
    competencyCode: competency?.code ?? null,
    competencyDescription: competency?.description ?? null,
  });
});

router.delete("/crosswalk-links/:id", async (req, res): Promise<void> => {
  const params = DeleteCrosswalkLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(crosswalkLinksTable)
    .where(eq(crosswalkLinksTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Crosswalk link not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/projects/:projectId/crosswalk/gaps", async (req, res): Promise<void> => {
  const params = GetCrosswalkGapsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const links = await db
    .select()
    .from(crosswalkLinksTable)
    .where(eq(crosswalkLinksTable.projectId, params.data.projectId));

  const mappedCompetencyIds = new Set(links.map((l) => l.competencyId));

  const allCompetencies = await db.select().from(standardCompetenciesTable);
  const unmapped = allCompetencies.filter((c) => !mappedCompetencyIds.has(c.id));

  const [framework] = await db.select().from(standardsFrameworksTable);

  res.json({
    projectId: params.data.projectId,
    frameworkName: framework?.name ?? "Standards Framework",
    totalCompetencies: allCompetencies.length,
    mappedCount: allCompetencies.length - unmapped.length,
    unmappedCount: unmapped.length,
    deliveryBlocked: unmapped.length > 0,
    gaps: unmapped,
  });
});

export default router;
