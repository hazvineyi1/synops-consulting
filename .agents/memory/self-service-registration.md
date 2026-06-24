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
`isSelfServiceProductKey()`). `compass` is now self-service: public sign-up
starts a free trial. Any product NOT in the allowlist is provisioned by an admin
who sets `users.product_key` directly. The server NEVER trusts a client-supplied
`productKey`, role, or org for the chosen self-service product: register FORCES
`productKey=compass`, `role=school_admin`, and a server-generated organization +
slug, ignoring any client-sent role/org identifiers.

**Why:** Product binding is an authorization boundary (`requireProduct` gates
every product API off `product_key`). If register trusted any client-supplied
key/role/org, anyone could self-provision into a product they should not reach,
or escalate to a global/other-org role. Self-service must be opt-in per product
and must pin the new account to a fresh tenant at the lowest sensible privilege.

**How to apply:** When a new product should accept public sign-ups, add its key
to the allowlist AND make register create the tenant + low-privilege user
transactionally, force the role/org server-side, regenerate the session, and
rate-limit register tighter than login. Keep generic error copy (no account
enumeration) and preserve unique-email handling. After changing the policy,
restart the api-server and curl-verify: register with a non-self-service
`productKey` -> 403; register with the self-service key -> 201 with the forced
role/org and a trial subscription.
