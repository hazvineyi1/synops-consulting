---
name: Self-service registration policy
description: Why public register must not trust a client-supplied productKey, and how products are provisioned
---

# Self-service registration policy

The public `POST /auth/register` endpoint binds the new user to a product via
`users.product_key`. The client sends `productKey`, but the server must NOT trust
it for arbitrary products.

## Rule
Only product keys in an explicit allowlist may be self-registered. Everything
else is rejected with 403. The allowlist lives in
`artifacts/api-server/src/lib/products.ts` (`SELF_SERVICE_PRODUCT_KEYS` +
`isSelfServiceProductKey()`); currently only the public client portal is
self-service. All other products are provisioned by an admin who sets
`users.product_key` directly.

**Why:** Product binding is an authorization boundary (`requireProduct` gates
every product API off `product_key`). If register trusted any client-supplied
key, anyone could self-provision into a paid/internal product (Cadence, Compass,
Meridian, etc.) and reach its data. Self-service must be opt-in per product, not
default-open.

**How to apply:** When a new product should accept public sign-ups, add its key
to the allowlist. Otherwise leave it out and provision via admin. After changing
the policy, restart the api-server and curl-verify: register with a
non-self-service `productKey` -> 403; register with the default/self-service key
-> 201.
