import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, organizationsTable } from "@workspace/db";

/**
 * Roles that bypass organization scoping entirely (see all tenants).
 * "admin" is the legacy global role; "super_admin" is its explicit successor.
 */
export const GLOBAL_ROLES = ["admin", "super_admin"] as const;
/** Roles that MUST be bound to a concrete organization. */
export const ORG_BOUND_ROLES = ["school_admin", "builder"] as const;

export function isGlobalRole(role: string): boolean {
  return role === "admin" || role === "super_admin";
}

function isOrgBoundRole(role: string): boolean {
  return role === "school_admin" || role === "builder";
}

/**
 * The acting user's tenancy context. Resolved once per request by
 * `loadActorContext` and consumed by the org-scoped query helpers in tenancy.ts.
 * `impersonatorUserId` is a placeholder for a later impersonation feature; it is
 * always null for now.
 */
export interface ActorContext {
  userId: number;
  role: string;
  organizationId: number | null;
  organizationType: string | null;
  isGlobal: boolean;
  impersonatorUserId: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: ActorContext;
    }
  }
}

/**
 * Loads `req.actor` from the DB. Must run after `requireAuth`.
 * - admin/super_admin are global (organization bypass).
 * - school_admin/builder must belong to an organization or they are denied 403.
 * Role and organization are read from the DB (not the session) so changes take
 * effect immediately.
 */
export const loadActorContext: RequestHandler = (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  void (async () => {
    try {
      const [user] = await db
        .select({ role: usersTable.role, organizationId: usersTable.organizationId })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      if (!user) {
        req.session.destroy(() => undefined);
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const isGlobal = isGlobalRole(user.role);

      if (!isGlobal && isOrgBoundRole(user.role) && user.organizationId == null) {
        res.status(403).json({ error: "Your account is not assigned to an organization." });
        return;
      }

      let organizationType: string | null = null;
      if (user.organizationId != null) {
        const [org] = await db
          .select({ type: organizationsTable.type })
          .from(organizationsTable)
          .where(eq(organizationsTable.id, user.organizationId));
        organizationType = org?.type ?? null;
      }

      req.actor = {
        userId,
        role: user.role,
        organizationId: user.organizationId,
        organizationType,
        isGlobal,
        impersonatorUserId: null,
      };
      next();
    } catch (err) {
      next(err);
    }
  })();
};
