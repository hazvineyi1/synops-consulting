import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, meetingRecordingsTable } from "@workspace/db";
import {
  ListMeetingRecordingsParams,
  CreateMeetingRecordingParams,
  CreateMeetingRecordingBody,
  DeleteMeetingRecordingParams,
} from "@workspace/api-zod";
import {
  denyNoScope,
  resolveProjectScope,
  resolveMeetingRecordingScope,
} from "../lib/tenancy";
import { recordActorAudit } from "../lib/audit";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

function serialize(row: typeof meetingRecordingsTable.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    title: row.title,
    objectPath: row.objectPath,
    externalUrl: row.externalUrl,
    durationSec: row.durationSec,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/projects/:projectId/recordings", async (req, res): Promise<void> => {
  const params = ListMeetingRecordingsParams.safeParse(req.params);
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
    .from(meetingRecordingsTable)
    .where(eq(meetingRecordingsTable.projectId, params.data.projectId))
    .orderBy(meetingRecordingsTable.createdAt);

  res.json(rows.map(serialize));
});

router.post("/projects/:projectId/recordings", async (req, res): Promise<void> => {
  const params = CreateMeetingRecordingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateMeetingRecordingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Enforce the per-kind shape: an upload must carry an object path produced by
  // the storage endpoint FOR THIS ACTOR; an external recording must carry an
  // http(s) link. The objectPath must sit in the caller's own upload namespace
  // (`/objects/uploads/<userId>/<uuid>`). This prevents a caller from attaching
  // (and then reading, via the serving ACL) an object they did not upload. The
  // trailing segment must be a bare UUID so no path traversal can slip through.
  if (parsed.data.kind === "upload") {
    const expectedPrefix = `/objects/uploads/${req.actor!.userId}/`;
    const objectPath = parsed.data.objectPath ?? "";
    const tail = objectPath.startsWith(expectedPrefix)
      ? objectPath.slice(expectedPrefix.length)
      : "";
    if (!/^[0-9a-fA-F-]{36}$/.test(tail)) {
      res.status(400).json({ error: "An uploaded recording requires a valid objectPath." });
      return;
    }
  } else {
    const url = parsed.data.externalUrl ?? "";
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: "An external recording requires an http(s) link." });
      return;
    }
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

  const isUpload = parsed.data.kind === "upload";
  const [row] = await db
    .insert(meetingRecordingsTable)
    .values({
      projectId: params.data.projectId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      objectPath: isUpload ? parsed.data.objectPath! : null,
      externalUrl: isUpload ? null : parsed.data.externalUrl!,
      durationSec: parsed.data.durationSec ?? null,
      contentType: isUpload ? parsed.data.contentType ?? null : null,
      sizeBytes: isUpload ? parsed.data.sizeBytes ?? null : null,
      createdByUserId: req.actor!.userId,
    })
    .returning();

  await recordActorAudit(req.actor!, {
    action: "create",
    entityType: "meeting_recording",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.status(201).json(serialize(row));
});

router.delete("/meeting-recordings/:id", async (req, res): Promise<void> => {
  const params = DeleteMeetingRecordingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveMeetingRecordingScope(params.data.id),
      "write",
      "Recording not found",
    )
  ) {
    return;
  }

  const [row] = await db
    .select()
    .from(meetingRecordingsTable)
    .where(eq(meetingRecordingsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Recording not found" });
    return;
  }

  await db.delete(meetingRecordingsTable).where(eq(meetingRecordingsTable.id, params.data.id));

  // Best-effort removal of the underlying object so deletes do not orphan blobs.
  if (row.kind === "upload" && row.objectPath) {
    try {
      const file = await objectStorageService.getObjectEntityFile(row.objectPath);
      await file.delete();
    } catch {
      // The DB row is already gone; serving 404s without it. Ignore blob errors.
    }
  }

  await recordActorAudit(req.actor!, {
    action: "delete",
    entityType: "meeting_recording",
    entityTitle: row.title,
    projectId: row.projectId,
  });

  res.status(204).end();
});

export default router;
