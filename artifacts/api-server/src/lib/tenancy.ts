import type { Response } from "express";
import { eq, sql, type SQL } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  coursesTable,
  modulesTable,
  classesTable,
  objectivesTable,
  assessmentsTable,
  activitiesTable,
  qaChecksTable,
  crosswalkLinksTable,
  type AllocationScopeType,
} from "@workspace/db";
import type { ActorContext } from "./actor";

/**
 * Whether `actor` may access data belonging to organization `orgId`.
 * Global actors (admin/super_admin) can access everything. A null/unknown org is
 * NEVER accessible to a non-global actor (no null-as-global, and a missing entity
 * looks the same as a cross-org one to a tenant).
 */
export function actorCanAccessOrg(actor: ActorContext, orgId: number | null | undefined): boolean {
  if (actor.isGlobal) return true;
  if (orgId == null) return false;
  return actor.organizationId === orgId;
}

/**
 * Guard helper: returns true (and writes a 404) when `actor` may NOT access the
 * given organization. A cross-org resource is reported as "not found" so a tenant
 * cannot probe for the existence of another organization's data.
 *
 *   if (denyCrossOrg(res, req.actor!, await getProjectOrgId(id), "Project not found")) return;
 */
export function denyCrossOrg(
  res: Response,
  actor: ActorContext,
  orgId: number | null | undefined,
  notFoundMessage: string,
): boolean {
  if (actorCanAccessOrg(actor, orgId)) return false;
  res.status(404).json({ error: notFoundMessage });
  return true;
}

// ── Org resolvers ───────────────────────────────────────────
// Every curriculum entity traces back to clients.organization_id. Each resolver
// returns the owning organization id, or null when the entity does not exist.

export async function getClientOrgId(clientId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId));
  return row?.orgId ?? null;
}

export async function getProjectOrgId(projectId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(projectsTable.id, projectId));
  return row?.orgId ?? null;
}

export async function getCourseOrgId(courseId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(coursesTable)
    .innerJoin(projectsTable, eq(coursesTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(coursesTable.id, courseId));
  return row?.orgId ?? null;
}

export async function getModuleOrgId(moduleId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(modulesTable)
    .innerJoin(coursesTable, eq(modulesTable.courseId, coursesTable.id))
    .innerJoin(projectsTable, eq(coursesTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(modulesTable.id, moduleId));
  return row?.orgId ?? null;
}

export async function getClassOrgId(classId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(classesTable)
    .innerJoin(coursesTable, eq(classesTable.courseId, coursesTable.id))
    .innerJoin(projectsTable, eq(coursesTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(classesTable.id, classId));
  return row?.orgId ?? null;
}

export async function getObjectiveOrgId(objectiveId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(objectivesTable)
    .innerJoin(projectsTable, eq(objectivesTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(objectivesTable.id, objectiveId));
  return row?.orgId ?? null;
}

export async function getAssessmentOrgId(assessmentId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(assessmentsTable)
    .innerJoin(coursesTable, eq(assessmentsTable.courseId, coursesTable.id))
    .innerJoin(projectsTable, eq(coursesTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(assessmentsTable.id, assessmentId));
  return row?.orgId ?? null;
}

export async function getActivityOrgId(activityId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(activitiesTable)
    .innerJoin(coursesTable, eq(activitiesTable.courseId, coursesTable.id))
    .innerJoin(projectsTable, eq(coursesTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(activitiesTable.id, activityId));
  return row?.orgId ?? null;
}

export async function getQaCheckOrgId(qaCheckId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(qaChecksTable)
    .innerJoin(projectsTable, eq(qaChecksTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(qaChecksTable.id, qaCheckId));
  return row?.orgId ?? null;
}

export async function getCrosswalkLinkOrgId(linkId: number): Promise<number | null> {
  const [row] = await db
    .select({ orgId: clientsTable.organizationId })
    .from(crosswalkLinksTable)
    .innerJoin(projectsTable, eq(crosswalkLinksTable.projectId, projectsTable.id))
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(crosswalkLinksTable.id, linkId));
  return row?.orgId ?? null;
}

/**
 * SQL predicate restricting a `clientsTable` query to the actor's organization.
 * Returns undefined for global actors (no restriction) and a never-true
 * predicate for a non-global actor that somehow has no organization.
 */
export function clientOrgFilter(actor: ActorContext): SQL | undefined {
  if (actor.isGlobal) return undefined;
  if (actor.organizationId == null) return sql`false`;
  return eq(clientsTable.organizationId, actor.organizationId);
}

// ── Allocation target validation (used by the allocations feature) ──────────

export async function getAllocationTargetOrgId(
  scopeType: AllocationScopeType,
  scopeId: number,
): Promise<number | null> {
  switch (scopeType) {
    case "project":
      return getProjectOrgId(scopeId);
    case "course":
      return getCourseOrgId(scopeId);
    case "class":
      return getClassOrgId(scopeId);
    default:
      return null;
  }
}

/**
 * An allocation may only target a scope (project/course/class) that belongs to
 * the same organization the allocation is created in.
 */
export async function assertAllocationTargetInOrg(
  scopeType: AllocationScopeType,
  scopeId: number,
  orgId: number,
): Promise<boolean> {
  const targetOrgId = await getAllocationTargetOrgId(scopeType, scopeId);
  return targetOrgId != null && targetOrgId === orgId;
}
