import { Router } from "express";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { db, usersTable, engagementsTable, organizationsTable } from "@workspace/db";
import type { UserRow } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/auth";
import { PRODUCT_KEYS, isSelfServiceProductKey } from "../lib/products";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

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

async function publicUser(u: UserRow) {
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
    createdAt: u.createdAt.toISOString(),
  };
}

function sampleEngagements(userId: number) {
  return [
    {
      userId,
      title: "Provider Network Adequacy Review",
      practiceArea: "Healthcare & Operations",
      status: "Active",
      nextMilestone: "Gap-analysis readout, week 3",
    },
    {
      userId,
      title: "Online Course Accessibility Audit",
      practiceArea: "Learning & EdTech",
      status: "In QA",
      nextMilestone: "WCAG 2.1 AA remediation sign-off",
    },
    {
      userId,
      title: "Adaptive Learning Pilot",
      practiceArea: "Platforms & SaaS",
      status: "Discovery",
      nextMilestone: "Scope & success-metrics workshop",
    },
  ];
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();

  // Public self-registration is allowed only for self-service products (Hub).
  // Every other product is provisioned by the engagement team, so reject an
  // attempt to self-register into one even though the client never offers it.
  const productKey = parsed.data.productKey ?? "hub";
  if (!isSelfServiceProductKey(productKey)) {
    res
      .status(403)
      .json({ error: "This product is provisioned by your engagement team." });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      name: parsed.data.name.trim(),
      organization: parsed.data.organization?.trim() || null,
      productKey,
    })
    .returning();

  // Hub clients get a few sample engagements so the portal is not empty on
  // first sign-in. Other products manage their own data.
  if (productKey === "hub") {
    await db.insert(engagementsTable).values(sampleEngagements(user.id));
  }

  req.session.userId = user.id;
  req.session.role = user.role;
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

  req.session.userId = user.id;
  req.session.role = user.role;
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
  res.json(await publicUser(user));
});

export default router;
