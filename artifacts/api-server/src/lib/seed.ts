import { eq, and, isNull, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  organizationsTable,
  clientsTable,
  projectsTable,
  coursesTable,
  classesTable,
  allocationsTable,
} from "@workspace/db";
import { hashPassword } from "./auth";
import { PRODUCT_KEYS } from "./products";

interface MinimalLogger {
  info: (obj: object, msg?: string) => void;
}

// The consulting firm's own tenant. The curriculum tree built by internal staff
// roots here; every pre-multi-tenancy client and compass user belongs to it.
const INTERNAL_ORG_SLUG = "synops-internal";
// A white-labeled external school tenant, used only to demonstrate org isolation.
const DEMO_SCHOOL_SLUG = "demo-academy";

/**
 * Idempotently ensure the internal organization exists and adopt any orphaned
 * tenancy rows. Runs in EVERY environment (production included) because the
 * curriculum engine cannot function without a tenant for internal staff:
 * `clients.organization_id` is NOT NULL and client creation copies the actor's
 * organization. Returns the internal org id for the demo seed to bind to.
 */
export async function ensureOrganizationsSeed(
  log: MinimalLogger,
): Promise<{ internalOrgId: number }> {
  let [internal] = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, INTERNAL_ORG_SLUG));

  if (!internal) {
    [internal] = await db
      .insert(organizationsTable)
      .values({
        name: "Synops Advisory Group",
        slug: INTERNAL_ORG_SLUG,
        type: "internal",
        tagline: "Internal consulting tenant",
      })
      .returning({ id: organizationsTable.id });
    log.info({ id: internal.id }, "Seeded internal organization");
  }

  // Adopt any compass user who predates multi-tenancy (null org) into the
  // internal tenant so the internal-consulting flow keeps working after upgrade.
  // School users are always created WITH an org, so they are never matched here.
  // Global roles (admin/super_admin) bypass org checks, so this is harmless even
  // if one happens to be a compass user.
  const adopted = await db
    .update(usersTable)
    .set({ organizationId: internal.id })
    .where(and(eq(usersTable.productKey, "compass"), isNull(usersTable.organizationId)))
    .returning({ id: usersTable.id });
  if (adopted.length > 0) {
    log.info({ count: adopted.length }, "Adopted orphaned compass users into internal org");
  }

  // Defensive safety net for any client row left without a tenant. The column is
  // NOT NULL on a clean schema, so this normally matches nothing.
  await db
    .update(clientsTable)
    .set({ organizationId: internal.id })
    .where(isNull(clientsTable.organizationId));

  return { internalOrgId: internal.id };
}

/** Idempotently find or create the dev-only demo school tenant. */
async function ensureDemoSchoolOrg(): Promise<number> {
  let [org] = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.slug, DEMO_SCHOOL_SLUG));

  if (!org) {
    [org] = await db
      .insert(organizationsTable)
      .values({
        name: "Demo Academy",
        slug: DEMO_SCHOOL_SLUG,
        type: "school",
        accentColor: "#2563eb",
        tagline: "White-labeled demo school tenant",
      })
      .returning({ id: organizationsTable.id });
  }

  return org.id;
}

const DEMO_DOMAIN = "demo.synops.test";
// Dev-only shared password for every seeded demo account. Documented in the
// project README; never used in production (this seed is skipped there).
const DEMO_PASSWORD = "Demo!2345";

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Idempotently seed a demo client for Compass plus a platform admin and the
 * role-based Compass accounts, so the branded login and console are reachable
 * for review. Skipped entirely in production.
 */
export async function ensureDemoUsers(
  log: MinimalLogger,
  internalOrgId: number,
): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const demoSchoolOrgId = await ensureDemoSchoolOrg();

  interface DemoAccount {
    email: string;
    name: string;
    role: string;
    productKey: string;
    organizationId: number | null;
  }

  const accounts: DemoAccount[] = [
    { email: `admin@${DEMO_DOMAIN}`, name: "Platform Admin", role: "admin", productKey: "compass", organizationId: null },
    ...PRODUCT_KEYS.map((key): DemoAccount => ({
      email: `${key}@${DEMO_DOMAIN}`,
      name: `${titleCase(key)} Demo`,
      role: "client",
      productKey: key,
      // The Compass demo client is an internal staffer; bind it to the internal
      // tenant so it sees the backfilled internal curriculum.
      organizationId: key === "compass" ? internalOrgId : null,
    })),
    // Role-based Compass accounts that demonstrate multi-tenancy. The super admin
    // is global (no org); the school admin and builder are scoped to the external
    // demo school tenant and must never see the internal org's curriculum.
    { email: `super-admin@${DEMO_DOMAIN}`, name: "Compass Super Admin", role: "super_admin", productKey: "compass", organizationId: null },
    { email: `school-admin@${DEMO_DOMAIN}`, name: "Demo Academy Admin", role: "school_admin", productKey: "compass", organizationId: demoSchoolOrgId },
    { email: `builder@${DEMO_DOMAIN}`, name: "Demo Academy Builder", role: "builder", productKey: "compass", organizationId: demoSchoolOrgId },
  ];

  const emails = accounts.map((a) => a.email);
  const existing = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(inArray(usersTable.email, emails));
  const existingSet = new Set(existing.map((r) => r.email));

  const toCreate = accounts.filter((a) => !existingSet.has(a.email));

  if (toCreate.length > 0) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);

    for (const acct of toCreate) {
      await db
        .insert(usersTable)
        .values({
          email: acct.email,
          passwordHash,
          name: acct.name,
          organization: "Synops Demo",
          organizationId: acct.organizationId,
          role: acct.role,
          productKey: acct.productKey,
        });
    }

    log.info({ count: toCreate.length }, "Seeded demo users");
  }
}

/**
 * Idempotently seed a small curriculum tree for the Demo Academy tenant plus a
 * course-level allocation for the demo builder, so the school-admin and builder
 * workspaces have data to review and the allocation access rule is demonstrable
 * (the builder can build within the allocated course and its descendants, but
 * not the parent project or the sibling course). Skipped in production and once
 * the tenant already has a client.
 */
export async function ensureDemoAcademyCurriculum(log: MinimalLogger): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const demoSchoolOrgId = await ensureDemoSchoolOrg();

  const existingClient = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.organizationId, demoSchoolOrgId))
    .limit(1);
  if (existingClient.length > 0) return;

  const [builder] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, `builder@${DEMO_DOMAIN}`));

  const [client] = await db
    .insert(clientsTable)
    .values({
      organizationId: demoSchoolOrgId,
      name: "Demo Academy District",
      contactName: "Demo Academy Admin",
      contactEmail: `school-admin@${DEMO_DOMAIN}`,
      institution: "Demo Academy",
      notes: "Synthetic demo tenant for role-based access review.",
    })
    .returning();

  const [project] = await db
    .insert(projectsTable)
    .values({
      clientId: client.id,
      title: "Ninth Grade Literacy Redesign",
      stage: 2,
      status: "active",
      modality: "Blended",
      description: "Standards-aligned redesign of the ninth grade literacy sequence.",
    })
    .returning();

  const courses = await db
    .insert(coursesTable)
    .values([
      { projectId: project.id, title: "English I: Foundations of Reading", creditHours: 1, termWeeks: 18, modality: "Blended" },
      { projectId: project.id, title: "English I: Writing Workshop", creditHours: 1, termWeeks: 18, modality: "Blended" },
    ])
    .returning();

  await db.insert(classesTable).values([
    { courseId: courses[0].id, name: "Period 1", section: "A", term: "Fall 2026", status: "active" },
    { courseId: courses[0].id, name: "Period 3", section: "B", term: "Fall 2026", status: "active" },
  ]);

  if (builder) {
    await db.insert(allocationsTable).values({
      organizationId: demoSchoolOrgId,
      builderUserId: builder.id,
      scopeType: "course",
      scopeId: courses[0].id,
      status: "active",
      notes: "Course-level allocation for access-control demo.",
    });
  }

  log.info(
    { orgId: demoSchoolOrgId, courses: courses.length },
    "Seeded Demo Academy curriculum + allocation",
  );
}
