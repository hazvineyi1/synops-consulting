// Allowed product keys, mirrored from the OpenAPI `ProductKey` enum. The server
// must never trust an arbitrary product slug from the client.
export const PRODUCT_KEYS = ["compass"] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];

export function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && (PRODUCT_KEYS as readonly string[]).includes(value);
}

// Products that offer public self-service registration. There are currently
// none: Compass is provisioned by the engagement team (an admin sets
// `users.product_key`), so the server rejects every self-registration attempt.
export const SELF_SERVICE_PRODUCT_KEYS = [] as const;

export function isSelfServiceProductKey(value: ProductKey): boolean {
  return (SELF_SERVICE_PRODUCT_KEYS as readonly string[]).includes(value);
}
