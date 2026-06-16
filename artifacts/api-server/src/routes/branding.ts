import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, organizationsTable } from "@workspace/db";
import { normalizeHost } from "../lib/branding";

/**
 * Public white-label branding lookup. Resolves branding from the request host
 * ONLY, and the host never authorizes anything: this endpoint returns cosmetic
 * theming (name, accent, tagline, logo) for the matched tenant, or a neutral
 * unbranded response when the host matches no configured organization domain.
 *
 * We read the raw Host header rather than req.hostname (which trusts the proxy's
 * X-Forwarded-Host) so a client cannot spoof another tenant's branding.
 */
const router = Router();

router.get("/branding", async (req, res): Promise<void> => {
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

  const host = normalizeHost(req.headers.host);
  if (!host) {
    res.json({ branded: false, organization: null });
    return;
  }

  const [org] = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      slug: organizationsTable.slug,
      type: organizationsTable.type,
      accentColor: organizationsTable.accentColor,
      tagline: organizationsTable.tagline,
      logoUrl: organizationsTable.logoUrl,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.domain, host));

  if (!org) {
    res.json({ branded: false, organization: null });
    return;
  }

  res.json({ branded: true, organization: org });
});

export default router;
