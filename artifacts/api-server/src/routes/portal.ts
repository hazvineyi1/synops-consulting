import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  engagementsTable,
  portalResourcesTable,
  contactSubmissionsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireProduct } from "../lib/auth";
import { sendContactNotification } from "../lib/email";

const router = Router();

// Hub is a product; only users bound to "hub" (and admins) may reach the client
// portal endpoints. Mirrors the server-as-security-boundary rule applied to the
// other product engines.
const requireHub = requireProduct("hub");

const messageSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

router.get("/portal/engagements", requireAuth, requireHub, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(engagementsTable)
    .where(eq(engagementsTable.userId, req.session.userId!))
    .orderBy(desc(engagementsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/portal/resources", requireAuth, requireHub, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(portalResourcesTable)
    .orderBy(desc(portalResourcesTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/portal/messages", requireAuth, requireHub, async (req, res): Promise<void> => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [submission] = await db
    .insert(contactSubmissionsTable)
    .values({
      name: user.name,
      organization: user.organization,
      email: user.email,
      areaOfInterest: parsed.data.subject,
      message: parsed.data.message.trim(),
      source: "portal",
    })
    .returning();

  await sendContactNotification(req.log, {
    name: submission.name,
    email: submission.email,
    organization: submission.organization,
    areaOfInterest: submission.areaOfInterest,
    message: submission.message,
    source: submission.source,
  });

  res.status(201).json({ ok: true, id: submission.id });
});

export default router;
