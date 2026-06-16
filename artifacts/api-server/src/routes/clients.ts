import { Router } from "express";
import { eq, count } from "drizzle-orm";
import { db, clientsTable, projectsTable } from "@workspace/db";
import {
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
} from "@workspace/api-zod";
import {
  builderClientIds,
  clientOrgFilter,
  denyBuilderWrite,
  denyCrossOrg,
  getClientOrgId,
  loadBuilderScope,
} from "../lib/tenancy";

const router = Router();

router.get("/clients", async (req, res): Promise<void> => {
  const actor = req.actor!;
  let clients = await db
    .select()
    .from(clientsTable)
    .where(clientOrgFilter(actor))
    .orderBy(clientsTable.createdAt);

  // Builders only see clients that own at least one of their allocated projects.
  if (actor.role === "builder") {
    const allowed = await builderClientIds(await loadBuilderScope(actor.userId));
    clients = clients.filter((c) => allowed.has(c.id));
  }

  const projectCounts = await db
    .select({ clientId: projectsTable.clientId, count: count() })
    .from(projectsTable)
    .groupBy(projectsTable.clientId);

  const countMap = new Map(projectCounts.map((r) => [r.clientId, Number(r.count)]));

  const result = clients.map((c) => ({
    ...c,
    projectCount: countMap.get(c.id) ?? 0,
  }));

  res.json(result);
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Creating a client sits above any allocation; builders cannot.
  if (denyBuilderWrite(res, req.actor!)) return;

  // A client is created inside the actor's organization (the tenant boundary).
  const organizationId = req.actor!.organizationId;
  if (organizationId == null) {
    res.status(400).json({ error: "No organization context for client creation." });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({
      organizationId,
      name: parsed.data.name,
      contactName: parsed.data.contactName ?? null,
      contactEmail: parsed.data.contactEmail ?? null,
      institution: parsed.data.institution ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json({ ...client, projectCount: 0 });
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  if (denyCrossOrg(res, req.actor!, client.organizationId, "Client not found")) return;

  // Builders may only read a client they reach through an allocated project.
  if (req.actor!.role === "builder") {
    const allowed = await builderClientIds(await loadBuilderScope(req.actor!.userId));
    if (!allowed.has(client.id)) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
  }

  const [projectCount] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.clientId, client.id));

  res.json({ ...client, projectCount: Number(projectCount?.count ?? 0) });
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Editing a client is an above-allocation write; builders cannot.
  if (denyBuilderWrite(res, req.actor!)) return;

  if (denyCrossOrg(res, req.actor!, await getClientOrgId(params.data.id), "Client not found")) return;

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.contactName !== undefined) updates.contactName = parsed.data.contactName;
  if (parsed.data.contactEmail !== undefined) updates.contactEmail = parsed.data.contactEmail;
  if (parsed.data.institution !== undefined) updates.institution = parsed.data.institution;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [client] = await db
    .update(clientsTable)
    .set(updates)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [projectCount] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.clientId, client.id));

  res.json({ ...client, projectCount: Number(projectCount?.count ?? 0) });
});

export default router;
