import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

/**
 * Idempotently create the Compass (Curriculum Builder) products and prices in
 * Stripe. Each plan tier becomes a Product (tagged metadata.tier) with a monthly
 * and yearly recurring Price carrying a stable lookup_key. The API server
 * resolves checkout prices by lookup_key, and webhooks map a subscription back
 * to a tier via metadata.tier / lookup_key, so these must stay in sync with
 * artifacts/api-server/src/lib/billing.ts.
 *
 * Safe to run repeatedly: products are matched by metadata.tier and prices by
 * lookup_key; existing ones are reused (lookup_key is transferred to the latest
 * price when amounts change).
 *
 * Run with: pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */

interface PlanSeed {
  tier: "starter" | "professional" | "enterprise";
  name: string;
  description: string;
  monthlyCents: number;
  yearlyCents: number;
  monthlyLookupKey: string;
  yearlyLookupKey: string;
}

const PLAN_SEEDS: PlanSeed[] = [
  {
    tier: "starter",
    name: "Curriculum Builder Starter",
    description: "For a single program getting its first courses to handoff. Up to 10 active courses.",
    monthlyCents: 4900,
    yearlyCents: 49000,
    monthlyLookupKey: "compass_starter_monthly",
    yearlyLookupKey: "compass_starter_yearly",
  },
  {
    tier: "professional",
    name: "Curriculum Builder Professional",
    description: "For a department running many programs with white-label branding. Up to 50 active courses.",
    monthlyCents: 14900,
    yearlyCents: 149000,
    monthlyLookupKey: "compass_professional_monthly",
    yearlyLookupKey: "compass_professional_yearly",
  },
  {
    tier: "enterprise",
    name: "Curriculum Builder Enterprise",
    description: "For an institution that needs scale, a custom domain, and unlimited active courses.",
    monthlyCents: 39900,
    yearlyCents: 390000,
    monthlyLookupKey: "compass_enterprise_monthly",
    yearlyLookupKey: "compass_enterprise_yearly",
  },
];

async function findProductByTier(stripe: Stripe, tier: string): Promise<Stripe.Product | null> {
  const found = await stripe.products.search({
    query: `metadata['tier']:'${tier}' AND active:'true'`,
    limit: 1,
  });
  return found.data[0] ?? null;
}

async function ensureProduct(stripe: Stripe, seed: PlanSeed): Promise<Stripe.Product> {
  const existing = await findProductByTier(stripe, seed.tier);
  if (existing) {
    console.log(`Product for tier "${seed.tier}" exists: ${existing.id}`);
    return existing;
  }
  const product = await stripe.products.create({
    name: seed.name,
    description: seed.description,
    metadata: { tier: seed.tier, app: "compass" },
  });
  console.log(`Created product "${seed.name}" (${product.id})`);
  return product;
}

async function ensurePrice(
  stripe: Stripe,
  product: Stripe.Product,
  tier: string,
  interval: "month" | "year",
  unitAmount: number,
  lookupKey: string,
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) {
    console.log(`Price "${lookupKey}" exists: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { tier },
  });
  console.log(`Created price "${lookupKey}" ${(unitAmount / 100).toFixed(2)}/${interval} (${price.id})`);
  return price;
}

async function main(): Promise<void> {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding Compass products and prices in Stripe...");
  for (const seed of PLAN_SEEDS) {
    const product = await ensureProduct(stripe, seed);
    await ensurePrice(stripe, product, seed.tier, "month", seed.monthlyCents, seed.monthlyLookupKey);
    await ensurePrice(stripe, product, seed.tier, "year", seed.yearlyCents, seed.yearlyLookupKey);
  }
  console.log("Done. Products and prices are ready.");
}

main().catch((err) => {
  console.error("Failed to seed products:", err instanceof Error ? err.message : err);
  process.exit(1);
});
