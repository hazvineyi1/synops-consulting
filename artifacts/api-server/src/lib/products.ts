// Allowed product keys, mirrored from the OpenAPI `ProductKey` enum. The server
// must never trust an arbitrary product slug from the client.
export const PRODUCT_KEYS = [
  "hub",
  "cadence",
  "rise",
  "compass",
  "meridian",
] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];

export function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && (PRODUCT_KEYS as readonly string[]).includes(value);
}

// Products that offer public self-service registration. Every other product is
// provisioned by the engagement team (an admin sets `users.product_key`), so the
// server must reject self-registration into them even though the client only
// surfaces the Hub sign-up form.
export const SELF_SERVICE_PRODUCT_KEYS = ["hub"] as const;

export function isSelfServiceProductKey(value: ProductKey): boolean {
  return (SELF_SERVICE_PRODUCT_KEYS as readonly string[]).includes(value);
}
