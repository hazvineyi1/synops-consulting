import { Router } from "express";
import { eq, or, like } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { db, usersTable, organizationsTable } from "@workspace/db";
import type { UserRow } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/auth";
import { PRODUCT_KEYS, isSelfServiceProductKey } from "../lib/products";
import { ensureStripeCustomer } from "../lib/stripeBilling";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

// Registration is tighter than login: each successful sign-up provisions a whole
// new tenant (org + user + Stripe customer), so we cap creation attempts well
// below the login rate to blunt automated tenant-spam.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-up attempts. Please try again later." },
});

const TRIAL_DAYS = 14;

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "school";
}

/**
 * Build a unique org slug from a display name. We pre-resolve a free slug by
 * scanning existing slugs that share the base and picking the first opening,
 * then fall back to a numeric suffix. The DB unique constraint on `slug` is the
 * backstop for the rare concurrent-signup race.
 */
async function generateOrgSlug(name: string): Promise<string> {
  const root = slugify(name);
  const rows = await db
    .select({ slug: organizationsTable.slug })
    .from(organizationsTable)
    .where(or(eq(organizationsTable.slug, root), like(organizationsTable.slug, `${root}-%`)));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// Drizzle wraps the pg driver error, so a unique_violation (SQLSTATE 23505) may
// sit on the thrown error or anywhere along its cause chain.
function isUniqueViolation(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    if (typeof cur === "object" && cur !== null && (cur as { code?: string }).code === "23505") {
      return true;
    }
    cur = (cur as { cause?: unknown } | null)?.cause;
  }
  return false;
}

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().min(1).max(200),
  organization: z.string().max(200).optional(),
  productKey: z.enum(PRODUCT_KEYS).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface ImpersonatorInfo {
  id: number;
  name: string;
  email: string;
}

async function publicUser(u: UserRow, impersonator: ImpersonatorInfo | null = null) {
  let organizationName: string | null = null;
  let organizationType: string | null = null;
  let organizationSlug: string | null = null;
  if (u.organizationId != null) {
    const [org] = await db
      .select({
        name: organizationsTable.name,
        type: organizationsTable.type,
        slug: organizationsTable.slug,
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, u.organizationId));
    organizationName = org?.name ?? null;
    organizationType = org?.type ?? null;
    organizationSlug = org?.slug ?? null;
  }
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    organization: u.organization,
    role: u.role,
    productKey: u.productKey,
    status: u.status,
    organizationId: u.organizationId,
    organizationName,
    organizationType,
    organizationSlug,
    // Present only while a super admin is acting as this user. The frontend uses
    // it to render a persistent banner with a "Stop impersonating" control.
    impersonator,
    createdAt: u.createdAt.toISOString(),
  };
}

// express-session callbacks are node-style; wrap them so we can await in order.
// Regenerating on login/register issues a brand-new session id (defeats session
// fixation) AND, critically, drops any stale `impersonatorUserId` so an
// impersonated session cannot silently swap identity outside the audited
// impersonation routes.
function regenerateSession(req: import("express").Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req: import("express").Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

router.post("/auth/register", registerLimiter, async (req, res): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();

  // Compass (Curriculum Builder) is the only self-service product. The server
  // FORCES the product key, role, and tenant; a client-supplied productKey,
  // role, or organization id is never trusted (registerSchema carries only
  // display fields, and zod strips unknown keys). The allowlist check keeps the
  // policy explicit: empty the allowlist and self-serve sign-up closes again.
  const productKey = "compass" as const;
  if (!isSelfServiceProductKey(productKey)) {
    res.status(403).json({ error: "Self-service sign-up is not available right now." });
    return;
  }

  const fullName = parsed.data.name.trim();
  const orgName = parsed.data.organization?.trim() || `${fullName}'s programs`;

  // Friendly fast duplicate check. The DB unique constraint on email is the real
  // guard for a concurrent-signup race (handled in the catch below).
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const slug = await generateOrgSlug(orgName);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  // Provision the tenant atomically: a new school organization on a trial, plus
  // the owning school_admin user bound to it. If either insert fails, neither
  // persists (no orphan org, no half-provisioned user).
  let user: UserRow;
  let orgId: number;
  try {
    const created = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizationsTable)
        .values({
          name: orgName,
          slug,
          type: "school",
          planTier: "trial",
          subscriptionStatus: "trialing",
          trialEndsAt,
        })
        .returning({ id: organizationsTable.id });
      const [u] = await tx
        .insert(usersTable)
        .values({
          email,
          passwordHash,
          name: fullName,
          organization: orgName,
          productKey,
          role: "school_admin",
          organizationId: org.id,
        })
        .returning();
      return { orgId: org.id, user: u };
    });
    user = created.user;
    orgId = created.orgId;
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    req.log.error({ err }, "Self-serve registration failed");
    res.status(500).json({ error: "Could not create your account. Please try again." });
    return;
  }

  // Best-effort: provision a Stripe customer up front so the first upgrade is one
  // click. Never block sign-up on Stripe (mirrors the email degrade-to-log).
  try {
    await ensureStripeCustomer(orgId, email);
  } catch (err) {
    req.log.warn({ err, orgId }, "Deferred Stripe customer creation at sign-up");
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  req.session.role = user.role;
  await saveSession(req);
  res.status(201).json(await publicUser(user));
});

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (user.status === "deactivated") {
    res.status(403).json({ error: "This account has been deactivated. Contact your administrator." });
    return;
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  req.session.role = user.role;
  await saveSession(req);
  res.json(await publicUser(user));
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user || user.status === "deactivated") {
    req.session.destroy(() => undefined);
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // When impersonating, surface the real operator so the client can show a
  // persistent banner. Branding/host never sets this; only the impersonation
  // routes do. If the recorded operator is missing, fail safe to no banner.
  let impersonator: ImpersonatorInfo | null = null;
  if (req.session.impersonatorUserId != null) {
    const [op] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.impersonatorUserId));
    impersonator = op ?? null;
  }

  res.json(await publicUser(user, impersonator));
});

export default router;
