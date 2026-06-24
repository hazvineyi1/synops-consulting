import Stripe from "stripe";

/**
 * Stripe access for one-off scripts (e.g. seed-products.ts).
 *
 * Mirrors artifacts/api-server/src/lib/stripeClient.ts: credentials come from
 * the Replit Stripe connector under `settings.secret` (not an env var), fetched
 * fresh on each call because the connector token can rotate.
 */
async function getStripeSecretKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Missing Replit connector environment. Connect Stripe via the Integrations tab.",
    );
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = (await resp.json()) as {
    items?: Array<{ settings?: { secret?: string } }>;
  };
  const secretKey = data.items?.[0]?.settings?.secret;

  if (!secretKey) {
    throw new Error(
      "Stripe is not connected or is missing a secret key. Connect Stripe via the Integrations tab first.",
    );
  }

  return secretKey;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(await getStripeSecretKey());
}
