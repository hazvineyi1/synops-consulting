import { inArray, eq, and, isNull } from "drizzle-orm";
import {
  db,
  portalResourcesTable,
  usersTable,
  organizationsTable,
  clientsTable,
  engagementsTable,
  engagementMilestonesTable,
  engagementDeliverablesTable,
  providersTable,
  networkAdequacyReviewsTable,
  providerDisputesTable,
} from "@workspace/db";
import { hashPassword } from "./auth";
import { PRODUCT_KEYS } from "./products";

interface MinimalLogger {
  info: (obj: object, msg?: string) => void;
}

const SAMPLE_RESOURCES = [
  {
    title: "Engagement Playbook",
    category: "Guides",
    description:
      "How we run every engagement: Assess → Design → Build → Sustain, with the artifacts you receive at each stage.",
    url: "#",
  },
  {
    title: "Accessibility & Compliance Checklist",
    category: "Templates",
    description:
      "Our WCAG 2.1 AA and Section 508 review checklist, used on every learning deliverable.",
    url: "#",
  },
  {
    title: "Quality Review Rubric",
    category: "Templates",
    description:
      "The course and curriculum review rubric we crosswalk against recognized quality standards.",
    url: "#",
  },
  {
    title: "Sample Quarterly Status Report",
    category: "Reports",
    description:
      "An example of the cadence, metrics, and format we deliver to engagement sponsors.",
    url: "#",
  },
];

/** Idempotently seed sample portal resources if none exist yet. */
export async function ensurePortalSeed(log: MinimalLogger): Promise<void> {
  const existing = await db.select().from(portalResourcesTable).limit(1);
  if (existing.length > 0) return;
  await db.insert(portalResourcesTable).values(SAMPLE_RESOURCES);
  log.info({ count: SAMPLE_RESOURCES.length }, "Seeded sample portal resources");
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

function demoEngagements(userId: number) {
  return [
    {
      userId,
      title: "K-12 Curriculum Modernization",
      practiceArea: "Education",
      status: "active",
      nextMilestone: "Module 3 review",
      description: "Standards-aligned redesign across four core courses.",
    },
    {
      userId,
      title: "Provider Network Adequacy Review",
      practiceArea: "Healthcare",
      status: "active",
      nextMilestone: "County gap analysis",
      description: "Quarterly adequacy assessment for the regional network.",
    },
    {
      userId,
      title: "Platform Accessibility Audit",
      practiceArea: "Platforms",
      status: "planning",
      nextMilestone: "Kickoff",
      description: "WCAG 2.1 AA audit and remediation plan.",
    },
  ];
}

interface CadenceMilestoneSeed {
  title: string;
  status: string;
}

interface CadenceDeliverableSeed {
  title: string;
  status: string;
  qaGateStatus: string;
  qaNotes: string | null;
  milestoneIdx: number;
}

interface CadenceEngagementSeed {
  title: string;
  practiceArea: string;
  status: string;
  nextMilestone: string;
  description: string;
  milestones: CadenceMilestoneSeed[];
  deliverables: CadenceDeliverableSeed[];
}

const CADENCE_SEED: CadenceEngagementSeed[] = [
  {
    title: "District Curriculum Modernization",
    practiceArea: "Education",
    status: "Active",
    nextMilestone: "Pilot launch",
    description: "Redesign core courses to current standards across the district.",
    milestones: [
      { title: "Discovery and audit", status: "Complete" },
      { title: "Design and build", status: "In progress" },
      { title: "Pilot launch", status: "Pending" },
    ],
    deliverables: [
      {
        title: "Current-state curriculum audit",
        status: "Complete",
        qaGateStatus: "passed",
        qaNotes: "Reviewed against state standards.",
        milestoneIdx: 0,
      },
      {
        title: "Standards crosswalk",
        status: "In review",
        qaGateStatus: "pending",
        qaNotes: null,
        milestoneIdx: 1,
      },
      {
        title: "Unit 1 redesign",
        status: "Not started",
        qaGateStatus: "pending",
        qaNotes: null,
        milestoneIdx: 1,
      },
    ],
  },
  {
    title: "Regional Health Network Readiness",
    practiceArea: "Healthcare",
    status: "Active",
    nextMilestone: "Adequacy report",
    description: "Assess and improve provider network adequacy for the region.",
    milestones: [
      { title: "Data intake", status: "Complete" },
      { title: "Gap analysis", status: "In progress" },
      { title: "Adequacy report", status: "Pending" },
    ],
    deliverables: [
      {
        title: "Provider data intake summary",
        status: "Complete",
        qaGateStatus: "passed",
        qaNotes: "Validated against the source registry.",
        milestoneIdx: 0,
      },
      {
        title: "County-level gap analysis",
        status: "In review",
        qaGateStatus: "failed",
        qaNotes: "Recheck three counties with stale data.",
        milestoneIdx: 1,
      },
      {
        title: "Network adequacy report",
        status: "Not started",
        qaGateStatus: "pending",
        qaNotes: null,
        milestoneIdx: 2,
      },
    ],
  },
];

async function seedCadenceData(userId: number): Promise<void> {
  for (const e of CADENCE_SEED) {
    const [engagement] = await db
      .insert(engagementsTable)
      .values({
        userId,
        title: e.title,
        practiceArea: e.practiceArea,
        status: e.status,
        nextMilestone: e.nextMilestone,
        description: e.description,
      })
      .returning();

    const milestoneIds: number[] = [];
    for (const [i, m] of e.milestones.entries()) {
      const [milestone] = await db
        .insert(engagementMilestonesTable)
        .values({
          engagementId: engagement.id,
          title: m.title,
          status: m.status,
          orderIndex: i,
        })
        .returning();
      milestoneIds.push(milestone.id);
    }

    for (const d of e.deliverables) {
      await db.insert(engagementDeliverablesTable).values({
        engagementId: engagement.id,
        milestoneId: milestoneIds[d.milestoneIdx] ?? null,
        title: d.title,
        status: d.status,
        qaGateStatus: d.qaGateStatus,
        qaNotes: d.qaNotes,
      });
    }
  }
}

/**
 * Idempotently seed one demo client per product plus a platform admin, so every
 * branded portal is reachable for review. Skipped entirely in production.
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
    { email: `admin@${DEMO_DOMAIN}`, name: "Platform Admin", role: "admin", productKey: "hub", organizationId: null },
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
      const [user] = await db
        .insert(usersTable)
        .values({
          email: acct.email,
          passwordHash,
          name: acct.name,
          organization: "Synops Demo",
          organizationId: acct.organizationId,
          role: acct.role,
          productKey: acct.productKey,
        })
        .returning();

      if (acct.productKey === "hub" && acct.role === "client") {
        await db.insert(engagementsTable).values(demoEngagements(user.id));
      }
    }

    log.info({ count: toCreate.length }, "Seeded demo users");
  }

  // Ensure the Cadence demo client has engagement data even when the account
  // was created before this seed existed. Idempotent: only seeds when the user
  // currently has no engagements.
  await ensureCadenceDemoData(log);
}

async function ensureCadenceDemoData(log: MinimalLogger): Promise<void> {
  const [cadenceUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, `cadence@${DEMO_DOMAIN}`));
  if (!cadenceUser) return;

  const existing = await db
    .select({ id: engagementsTable.id })
    .from(engagementsTable)
    .where(eq(engagementsTable.userId, cadenceUser.id))
    .limit(1);
  if (existing.length > 0) return;

  await seedCadenceData(cadenceUser.id);
  log.info({ userId: cadenceUser.id }, "Seeded Cadence demo data");
}

// ── Meridian (provider operations) synthetic seed ─────────────
// All records below are fabricated for demo only. No real provider or patient
// data is used.
const MERIDIAN_PROVIDERS = [
  { name: "Blue Ridge Family Medicine", specialty: "Primary Care", region: "Central", networkStatus: "In-network", acceptingPatients: true, panelSize: 1850 },
  { name: "Cardinal Cardiology Associates", specialty: "Cardiology", region: "Central", networkStatus: "In-network", acceptingPatients: false, panelSize: 920 },
  { name: "Tidewater Pediatrics", specialty: "Pediatrics", region: "Coastal", networkStatus: "In-network", acceptingPatients: true, panelSize: 1340 },
  { name: "Shenandoah Behavioral Health", specialty: "Behavioral Health", region: "Western", networkStatus: "Pending", acceptingPatients: true, panelSize: 410 },
  { name: "Piedmont Orthopedics", specialty: "Orthopedics", region: "Central", networkStatus: "In-network", acceptingPatients: true, panelSize: 760 },
  { name: "Coastal OB-GYN Group", specialty: "OB-GYN", region: "Coastal", networkStatus: "Out-of-network", acceptingPatients: false, panelSize: 0 },
  { name: "Highlands Internal Medicine", specialty: "Primary Care", region: "Western", networkStatus: "In-network", acceptingPatients: true, panelSize: 1605 },
  { name: "James River Dermatology", specialty: "Dermatology", region: "Central", networkStatus: "In-network", acceptingPatients: true, panelSize: 540 },
];

const MERIDIAN_REVIEWS = [
  { region: "Central", specialty: "Primary Care", requiredProviders: 6, actualProviders: 7, status: "Adequate", notes: "Meets time and distance standards." },
  { region: "Central", specialty: "Cardiology", requiredProviders: 3, actualProviders: 2, status: "At risk", notes: "One provider closed panel; monitor wait times." },
  { region: "Coastal", specialty: "Pediatrics", requiredProviders: 4, actualProviders: 4, status: "Adequate", notes: null },
  { region: "Coastal", specialty: "OB-GYN", requiredProviders: 3, actualProviders: 1, status: "Deficient", notes: "Active recruitment needed in two counties." },
  { region: "Western", specialty: "Behavioral Health", requiredProviders: 5, actualProviders: 3, status: "Deficient", notes: "Telehealth expansion under review." },
  { region: "Western", specialty: "Primary Care", requiredProviders: 4, actualProviders: 5, status: "Adequate", notes: null },
];

interface DisputeSeedNote {
  author: string;
  body: string;
  at: string;
}

interface DisputeSeed {
  subject: string;
  category: string;
  status: string;
  priority: string;
  notes: DisputeSeedNote[];
}

const MERIDIAN_DISPUTES: DisputeSeed[] = [
  {
    subject: "Claim reprocessing for Q1 telehealth visits",
    category: "Claims",
    status: "In review",
    priority: "High",
    notes: [
      { author: "Operations", body: "Provider reports 14 telehealth claims denied in error.", at: "2026-03-04T14:10:00.000Z" },
      { author: "Operations", body: "Confirmed coding update; routed to claims for batch reprocessing.", at: "2026-03-06T09:30:00.000Z" },
    ],
  },
  {
    subject: "Contract rate discrepancy on orthopedic procedures",
    category: "Contracting",
    status: "Open",
    priority: "Normal",
    notes: [
      { author: "Operations", body: "Provider flagged mismatch between fee schedule and contract addendum.", at: "2026-04-12T16:45:00.000Z" },
    ],
  },
  {
    subject: "Credentialing delay for new behavioral health clinician",
    category: "Credentialing",
    status: "Escalated",
    priority: "Urgent",
    notes: [
      { author: "Operations", body: "Primary source verification stalled past 30 days.", at: "2026-05-01T11:00:00.000Z" },
      { author: "Operations", body: "Escalated to credentialing committee for expedited review.", at: "2026-05-08T13:20:00.000Z" },
    ],
  },
  {
    subject: "Directory listing correction for Tidewater Pediatrics",
    category: "Directory",
    status: "Resolved",
    priority: "Low",
    notes: [
      { author: "Operations", body: "Address and accepting-patients flag updated in directory.", at: "2026-02-18T10:05:00.000Z" },
    ],
  },
];

/**
 * Idempotently seed synthetic Meridian provider-operations data. Skipped in
 * production and when records already exist.
 */
export async function ensureMeridianSeed(log: MinimalLogger): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const existing = await db.select({ id: providersTable.id }).from(providersTable).limit(1);
  if (existing.length > 0) return;

  const providers = await db.insert(providersTable).values(MERIDIAN_PROVIDERS).returning();
  await db.insert(networkAdequacyReviewsTable).values(MERIDIAN_REVIEWS);
  await db.insert(providerDisputesTable).values(
    MERIDIAN_DISPUTES.map((d, i) => ({
      providerId: providers[i % providers.length]?.id ?? null,
      subject: d.subject,
      category: d.category,
      status: d.status,
      priority: d.priority,
      notes: d.notes,
    })),
  );

  log.info(
    {
      providers: MERIDIAN_PROVIDERS.length,
      reviews: MERIDIAN_REVIEWS.length,
      disputes: MERIDIAN_DISPUTES.length,
    },
    "Seeded Meridian demo data",
  );
}
