import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, qaChecksTable } from "@workspace/db";
import {
  ListQAChecksParams,
  CreateQACheckParams,
  CreateQACheckBody,
  UpdateQACheckParams,
  UpdateQACheckBody,
} from "@workspace/api-zod";
import { denyCrossOrg, getProjectOrgId, getQaCheckOrgId } from "../lib/tenancy";

const router = Router();

router.get("/projects/:projectId/qa", async (req, res): Promise<void> => {
  const params = ListQAChecksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getProjectOrgId(params.data.projectId), "Project not found")) {
    return;
  }

  const checks = await db
    .select()
    .from(qaChecksTable)
    .where(eq(qaChecksTable.projectId, params.data.projectId))
    .orderBy(qaChecksTable.createdAt);

  res.json(checks);
});

router.post("/projects/:projectId/qa", async (req, res): Promise<void> => {
  const params = CreateQACheckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateQACheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getProjectOrgId(params.data.projectId), "Project not found")) {
    return;
  }

  const [check] = await db
    .insert(qaChecksTable)
    .values({
      projectId: params.data.projectId,
      checkType: parsed.data.checkType,
      status: parsed.data.status,
      findings: parsed.data.findings ?? null,
      gateBlock: parsed.data.gateBlock ?? false,
      passedCount: parsed.data.passedCount ?? null,
      failedCount: parsed.data.failedCount ?? null,
      remediationNotes: null,
    })
    .returning();

  res.status(201).json(check);
});

router.patch("/qa-checks/:id", async (req, res): Promise<void> => {
  const params = UpdateQACheckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQACheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (denyCrossOrg(res, req.actor!, await getQaCheckOrgId(params.data.id), "QA check not found")) {
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.findings !== undefined) updates.findings = parsed.data.findings;
  if (parsed.data.remediationNotes !== undefined) updates.remediationNotes = parsed.data.remediationNotes;
  if (parsed.data.gateBlock !== undefined) updates.gateBlock = parsed.data.gateBlock;
  if (parsed.data.passedCount !== undefined) updates.passedCount = parsed.data.passedCount;
  if (parsed.data.failedCount !== undefined) updates.failedCount = parsed.data.failedCount;

  const [check] = await db
    .update(qaChecksTable)
    .set(updates)
    .where(eq(qaChecksTable.id, params.data.id))
    .returning();

  if (!check) {
    res.status(404).json({ error: "QA check not found" });
    return;
  }

  res.json(check);
});

export default router;
