import { Router } from "express";
import { desc } from "drizzle-orm";
import { db, usersTable, contactSubmissionsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router = Router();

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      organization: usersTable.organization,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/admin/submissions", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contactSubmissionsTable)
    .orderBy(desc(contactSubmissionsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
