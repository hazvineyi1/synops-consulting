import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  projectMeetingsTable,
  meetingActionItemsTable,
  projectsTable,
  coursesTable,
  type ProjectMeetingRow,
  type MeetingActionItemRow,
} from "@workspace/db";
import {
  ListProjectMeetingsParams,
  CreateProjectMeetingParams,
  CreateProjectMeetingBody,
  GetMeetingParams,
  UpdateMeetingParams,
  UpdateMeetingBody,
  DeleteMeetingParams,
  ProcessMeetingNotesParams,
  SetAgendaChecklistParams,
  SetAgendaChecklistBody,
  ListProjectActionItemsParams,
  CreateProjectActionItemParams,
  CreateProjectActionItemBody,
  UpdateActionItemParams,
  UpdateActionItemBody,
  DeleteActionItemParams,
  GetAgendaSummaryParams,
} from "@workspace/api-zod";
import {
  denyNoScope,
  resolveProjectScope,
  resolveMeetingScope,
  resolveActionItemScope,
  resolveCorrespondenceScope,
} from "../lib/tenancy";
import { recordActorAudit } from "../lib/audit";
import { extractAgendaFromNotes, type AgendaAiInput } from "../lib/agendaAi";

const router = Router();

// ── Persisted agenda shape ─────────────────────────────────────
// The meeting's `generatedAgenda` column stores the proposed agenda for the NEXT
// meeting as a JSON blob. The column default "{}" means "not processed yet" and
// serializes to null. A valid plan always carries `summary` and `items` arrays.
interface StoredAgendaItem {
  title: string;
  minutes: number;
  prompts: string[];
  // Interactive checklist state. `done` checks off the whole item (used for items
  // with no prompts); `promptsDone` is aligned by index with `prompts`. Both are
  // optional so agendas stored before checklists existed read back as "unchecked",
  // and regenerating an agenda omits them, resetting the checklist.
  done?: boolean;
  promptsDone?: boolean[];
}

interface StoredAgenda {
  generatedAt: string;
  proposedDate: string | null;
  proposedTime: string | null;
  summary: string[];
  items: StoredAgendaItem[];
  openActionCount: number;
}

function parseAgenda(raw: string): StoredAgenda | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (
      value &&
      typeof value === "object" &&
      Array.isArray((value as StoredAgenda).items) &&
      Array.isArray((value as StoredAgenda).summary)
    ) {
      return value as StoredAgenda;
    }
    return null;
  } catch {
    return null;
  }
}

function serializeMeeting(row: ProjectMeetingRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    notes: row.notes,
    nextMeetingAt: row.nextMeetingAt ? row.nextMeetingAt.toISOString() : null,
    generatedAgenda: parseAgenda(row.generatedAgenda),
    aiProvider: row.aiProvider,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeActionItem(row: MeetingActionItemRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    sourceMeetingId: row.sourceMeetingId,
    sourceCorrespondenceId: row.sourceCorrespondenceId,
    title: row.title,
    description: row.description,
    ownerName: row.ownerName,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    status: row.status,
    category: row.category,
    weekIndex: row.weekIndex,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Combine a proposed date (YYYY-MM-DD) and time (HH:MM) into a concrete instant
// for the persisted nextMeetingAt. Returns null when there is no proposed date.
function nextSlotToDate(proposedDate: string | null, proposedTime: string | null): Date | null {
  if (!proposedDate) return null;
  const time = proposedTime ?? "10:00";
  const d = new Date(`${proposedDate}T${time}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Meetings ───────────────────────────────────────────────────

router.get("/projects/:projectId/meetings", async (req, res): Promise<void> => {
  const params = ListProjectMeetingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "read",
      "Project not found",
    )
  ) {
    return;
  }

  const rows = await db
    .select()
    .from(projectMeetingsTable)
    .where(eq(projectMeetingsTable.projectId, params.data.projectId))
    .orderBy(desc(projectMeetingsTable.createdAt));

  res.json(rows.map(serializeMeeting));
});

router.post("/projects/:projectId/meetings", async (req, res): Promise<void> => {
  const params = CreateProjectMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateProjectMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "write",
      "Project not found",
    )
  ) {
    return;
  }

  const [row] = await db
    .insert(projectMeetingsTable)
    .values({
      projectId: params.data.projectId,
      title: parsed.data.title,
      scheduledAt: parsed.data.scheduledAt ?? null,
      notes: parsed.data.notes ?? "",
      createdByUserId: req.actor!.userId,
    })
    .returning();

  await recordActorAudit(req.actor!, {
    action: "create",
    entityType: "meeting",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.status(201).json(serializeMeeting(row));
});

router.get("/meetings/:id", async (req, res): Promise<void> => {
  const params = GetMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveMeetingScope(params.data.id),
      "read",
      "Meeting not found",
    )
  ) {
    return;
  }

  const [row] = await db
    .select()
    .from(projectMeetingsTable)
    .where(eq(projectMeetingsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  res.json(serializeMeeting(row));
});

router.put("/meetings/:id", async (req, res): Promise<void> => {
  const params = UpdateMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveMeetingScope(params.data.id),
      "write",
      "Meeting not found",
    )
  ) {
    return;
  }

  const update: Partial<typeof projectMeetingsTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.scheduledAt !== undefined) update.scheduledAt = parsed.data.scheduledAt;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
  if (parsed.data.nextMeetingAt !== undefined) update.nextMeetingAt = parsed.data.nextMeetingAt;

  if (Object.keys(update).length === 0) {
    const [row] = await db
      .select()
      .from(projectMeetingsTable)
      .where(eq(projectMeetingsTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }
    res.json(serializeMeeting(row));
    return;
  }

  const [row] = await db
    .update(projectMeetingsTable)
    .set(update)
    .where(eq(projectMeetingsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  await recordActorAudit(req.actor!, {
    action: "update",
    entityType: "meeting",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.json(serializeMeeting(row));
});

// Check off (or un-check) a single proposed-agenda item, or one prompt within an
// item. The agenda lives as a JSON blob in one column, so the read-modify-write
// runs inside a row-locked transaction: concurrent toggles serialize on the lock
// and never clobber one another.
router.patch("/meetings/:id/agenda-checklist", async (req, res): Promise<void> => {
  const params = SetAgendaChecklistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SetAgendaChecklistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveMeetingScope(params.data.id),
      "write",
      "Meeting not found",
    )
  ) {
    return;
  }

  const { itemIndex, promptIndex, done } = parsed.data;

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(projectMeetingsTable)
      .where(eq(projectMeetingsTable.id, params.data.id))
      .for("update");
    if (!row) return { kind: "not_found" as const };

    const agenda = parseAgenda(row.generatedAgenda);
    if (!agenda) return { kind: "no_agenda" as const };
    if (itemIndex >= agenda.items.length) return { kind: "out_of_range" as const };

    const item = agenda.items[itemIndex];
    if (promptIndex == null) {
      item.done = done;
    } else {
      if (promptIndex >= item.prompts.length) return { kind: "out_of_range" as const };
      const promptsDone = Array.isArray(item.promptsDone) ? [...item.promptsDone] : [];
      while (promptsDone.length < item.prompts.length) promptsDone.push(false);
      promptsDone[promptIndex] = done;
      item.promptsDone = promptsDone;
    }

    const [updated] = await tx
      .update(projectMeetingsTable)
      .set({ generatedAgenda: JSON.stringify(agenda) })
      .where(eq(projectMeetingsTable.id, row.id))
      .returning();
    return { kind: "ok" as const, row: updated };
  });

  if (result.kind === "not_found") {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }
  if (result.kind === "no_agenda") {
    res.status(409).json({ error: "This meeting has no generated agenda to update" });
    return;
  }
  if (result.kind === "out_of_range") {
    res.status(400).json({ error: "Agenda item or prompt index is out of range" });
    return;
  }

  res.json(serializeMeeting(result.row));
});

router.delete("/meetings/:id", async (req, res): Promise<void> => {
  const params = DeleteMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveMeetingScope(params.data.id),
      "write",
      "Meeting not found",
    )
  ) {
    return;
  }

  const [row] = await db
    .select()
    .from(projectMeetingsTable)
    .where(eq(projectMeetingsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  await db.delete(projectMeetingsTable).where(eq(projectMeetingsTable.id, params.data.id));

  await recordActorAudit(req.actor!, {
    action: "delete",
    entityType: "meeting",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.status(204).end();
});

// Turn a meeting's notes into action items and a proposed next-meeting agenda.
router.post("/meetings/:id/process-notes", async (req, res): Promise<void> => {
  const params = ProcessMeetingNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveMeetingScope(params.data.id),
      "write",
      "Meeting not found",
    )
  ) {
    return;
  }

  const [meeting] = await db
    .select()
    .from(projectMeetingsTable)
    .where(eq(projectMeetingsTable.id, params.data.id));
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  // Context for the extractor: the project, its first course (for term length),
  // and the action items still open across the project.
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, meeting.projectId));
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.projectId, meeting.projectId))
    .orderBy(coursesTable.id)
    .limit(1);

  const openItems = await db
    .select()
    .from(meetingActionItemsTable)
    .where(
      and(
        eq(meetingActionItemsTable.projectId, meeting.projectId),
        eq(meetingActionItemsTable.status, "open"),
      ),
    );

  const input: AgendaAiInput = {
    notes: meeting.notes,
    projectTitle: project?.title ?? "Project",
    courseTitle: course?.title ?? null,
    termWeeks: course?.termWeeks ?? null,
    meetingTitle: meeting.title,
    meetingDate: meeting.scheduledAt ?? null,
    openActionItems: openItems.map((i) => ({ title: i.title, status: i.status })),
  };

  const extraction = await extractAgendaFromNotes(input);

  // Persist the freshly extracted action items, attributed to this meeting.
  let created: MeetingActionItemRow[] = [];
  if (extraction.actionItems.length > 0) {
    created = await db
      .insert(meetingActionItemsTable)
      .values(
        extraction.actionItems.map((a) => ({
          projectId: meeting.projectId,
          sourceMeetingId: meeting.id,
          title: a.title,
          description: a.description,
          ownerName: a.ownerName,
          dueAt: a.dueAt ? new Date(a.dueAt) : null,
          category: a.category,
          weekIndex: a.weekIndex,
        })),
      )
      .returning();
  }

  const openActionCount = openItems.length + created.length;
  const agenda: StoredAgenda = {
    generatedAt: new Date().toISOString(),
    proposedDate: extraction.agenda.proposedDate,
    proposedTime: extraction.agenda.proposedTime,
    summary: extraction.agenda.summary,
    items: extraction.agenda.items,
    openActionCount,
  };

  const nextMeetingAt = nextSlotToDate(agenda.proposedDate, agenda.proposedTime);

  const [updated] = await db
    .update(projectMeetingsTable)
    .set({
      generatedAgenda: JSON.stringify(agenda),
      aiProvider: extraction.provider,
      nextMeetingAt,
    })
    .where(eq(projectMeetingsTable.id, meeting.id))
    .returning();

  await recordActorAudit(req.actor!, {
    action: "process",
    entityType: "meeting",
    entityTitle: meeting.title,
    projectId: meeting.projectId,
  });

  res.json({
    provider: extraction.provider,
    meeting: serializeMeeting(updated),
    createdActionItems: created.map(serializeActionItem),
    agenda,
  });
});

// ── Action items ───────────────────────────────────────────────

router.get("/projects/:projectId/action-items", async (req, res): Promise<void> => {
  const params = ListProjectActionItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "read",
      "Project not found",
    )
  ) {
    return;
  }

  const rows = await db
    .select()
    .from(meetingActionItemsTable)
    .where(eq(meetingActionItemsTable.projectId, params.data.projectId))
    .orderBy(meetingActionItemsTable.createdAt);

  res.json(rows.map(serializeActionItem));
});

router.post("/projects/:projectId/action-items", async (req, res): Promise<void> => {
  const params = CreateProjectActionItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateProjectActionItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "write",
      "Project not found",
    )
  ) {
    return;
  }

  // When promoting a piece of correspondence into an action item, the linked
  // correspondence must belong to THIS project (and therefore this org). Anything
  // else is reported as not found so a tenant cannot link across projects/orgs.
  if (parsed.data.sourceCorrespondenceId != null) {
    const corrScope = await resolveCorrespondenceScope(parsed.data.sourceCorrespondenceId);
    if (!corrScope || corrScope.projectId !== params.data.projectId) {
      res.status(404).json({ error: "Correspondence not found" });
      return;
    }
  }

  const [row] = await db
    .insert(meetingActionItemsTable)
    .values({
      projectId: params.data.projectId,
      sourceCorrespondenceId: parsed.data.sourceCorrespondenceId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      ownerName: parsed.data.ownerName ?? null,
      dueAt: parsed.data.dueAt ?? null,
      category: parsed.data.category ?? "general",
      weekIndex: parsed.data.weekIndex ?? null,
    })
    .returning();

  await recordActorAudit(req.actor!, {
    action: "create",
    entityType: "action_item",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.status(201).json(serializeActionItem(row));
});

router.patch("/action-items/:id", async (req, res): Promise<void> => {
  const params = UpdateActionItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateActionItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveActionItemScope(params.data.id),
      "write",
      "Action item not found",
    )
  ) {
    return;
  }

  const update: Partial<typeof meetingActionItemsTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.ownerName !== undefined) update.ownerName = parsed.data.ownerName;
  if (parsed.data.dueAt !== undefined) update.dueAt = parsed.data.dueAt;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.weekIndex !== undefined) update.weekIndex = parsed.data.weekIndex;
  // Completing an item stamps completedAt; reopening clears it.
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
    update.completedAt = parsed.data.status === "done" ? new Date() : null;
  }

  if (Object.keys(update).length === 0) {
    const [row] = await db
      .select()
      .from(meetingActionItemsTable)
      .where(eq(meetingActionItemsTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Action item not found" });
      return;
    }
    res.json(serializeActionItem(row));
    return;
  }

  const [row] = await db
    .update(meetingActionItemsTable)
    .set(update)
    .where(eq(meetingActionItemsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Action item not found" });
    return;
  }

  await recordActorAudit(req.actor!, {
    action: "update",
    entityType: "action_item",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.json(serializeActionItem(row));
});

router.delete("/action-items/:id", async (req, res): Promise<void> => {
  const params = DeleteActionItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveActionItemScope(params.data.id),
      "write",
      "Action item not found",
    )
  ) {
    return;
  }

  const [row] = await db
    .select()
    .from(meetingActionItemsTable)
    .where(eq(meetingActionItemsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Action item not found" });
    return;
  }

  await db.delete(meetingActionItemsTable).where(eq(meetingActionItemsTable.id, params.data.id));

  await recordActorAudit(req.actor!, {
    action: "delete",
    entityType: "action_item",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.status(204).end();
});

// ── Derived agenda summary ─────────────────────────────────────

router.get("/projects/:projectId/agenda-summary", async (req, res): Promise<void> => {
  const params = GetAgendaSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "read",
      "Project not found",
    )
  ) {
    return;
  }

  const items = await db
    .select()
    .from(meetingActionItemsTable)
    .where(eq(meetingActionItemsTable.projectId, params.data.projectId));

  const meetings = await db
    .select()
    .from(projectMeetingsTable)
    .where(eq(projectMeetingsTable.projectId, params.data.projectId))
    .orderBy(desc(projectMeetingsTable.createdAt));

  const totalActionItems = items.length;
  const doneActionItems = items.filter((i) => i.status === "done").length;
  const openActionItems = totalActionItems - doneActionItems;
  const pct = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));

  // Weekly build-progress bars, one bucket per distinct week index in use.
  const weekBuckets = new Map<number, { total: number; done: number }>();
  for (const i of items) {
    if (i.weekIndex == null) continue;
    const bucket = weekBuckets.get(i.weekIndex) ?? { total: 0, done: 0 };
    bucket.total += 1;
    if (i.status === "done") bucket.done += 1;
    weekBuckets.set(i.weekIndex, bucket);
  }
  const weeks = [...weekBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekIndex, b]) => ({
      weekIndex,
      label: `Week ${weekIndex + 1}`,
      total: b.total,
      done: b.done,
      percent: pct(b.done, b.total),
    }));

  const accItems = items.filter((i) => i.category === "accessibility");
  const accDone = accItems.filter((i) => i.status === "done").length;
  const accessibility = {
    total: accItems.length,
    done: accDone,
    percent: pct(accDone, accItems.length),
  };

  // The latest agenda is the most recent meeting that has been processed.
  let latestAgenda: StoredAgenda | null = null;
  for (const m of meetings) {
    const parsed = parseAgenda(m.generatedAgenda);
    if (parsed) {
      latestAgenda = parsed;
      break;
    }
  }

  // The furthest-out proposed next meeting across all meetings.
  let nextMeetingAt: string | null = null;
  for (const m of meetings) {
    if (m.nextMeetingAt && (nextMeetingAt === null || m.nextMeetingAt.toISOString() > nextMeetingAt)) {
      nextMeetingAt = m.nextMeetingAt.toISOString();
    }
  }

  res.json({
    projectId: params.data.projectId,
    totalActionItems,
    doneActionItems,
    openActionItems,
    buildProgressPercent: pct(doneActionItems, totalActionItems),
    weeks,
    accessibility,
    latestAgenda,
    nextMeetingAt,
  });
});

export default router;
