---
name: Self-service registration, email verification, and trial read-only
description: Why public register must not trust a client-supplied productKey, why the trial clock starts at email verification (not registration), and how an expired trial becomes read-only
---

# Self-service registration policy

The public `POST /auth/register` endpoint binds the new user to a product via
`users.product_key`. The client sends `productKey`, but the server must NOT trust
it for arbitrary products.

## Rule: product binding is server-forced
Only product keys in an explicit allowlist may be self-registered. Everything
else is rejected with 403. The allowlist lives in
`artifacts/api-server/src/lib/products.ts` (`SELF_SERVICE_PRODUCT_KEYS` +
`isSelfServiceProductKey()`). `compass` is self-service. The server NEVER trusts a
client-supplied `productKey`, role, or org: register FORCES `productKey=compass`,
`role=school_admin`, and a server-generated organization + slug, ignoring any
client-sent role/org identifiers.

**Why:** Product binding is an authorization boundary (`requireProduct` gates
every product API off `product_key`). If register trusted any client-supplied
key/role/org, anyone could self-provision into a product they should not reach,
or escalate to a global/other-org role.

## Rule: email verification gates the trial, not registration
Register creates the org (`trialEndsAt = null`) and an UNVERIFIED user
(`emailVerifiedAt = null`), establishes NO session, creates NO Stripe customer and
NO first client, and returns `202 {ok,email,verificationRequired}`. The 14-day
trial clock, the auto-created first client, the Stripe customer, and the session
are all finalized at `POST /auth/verify-email`, not at registration. Login returns
`403 {code:"email_unverified"}` until verified. A kill-switch env
`REQUIRE_EMAIL_VERIFICATION` (default on) can skip this for emergencies; when off,
register signs the user in immediately and logs a loud warning in prod.

**Why:** Confirming the address before anything of value (trial time, billing
customer, a usable session) is created is the abuse/anti-spam boundary. Doing the
work at verification means an unconfirmed address never consumes trial capacity.

**How to apply:** Tokens are single-use, sha256-at-rest, 24h TTL, consumed with an
atomic `UPDATE ... RETURNING`; verify resolves+validates the userId before
establishing the session (so the token table needs no FK and orphan rows are
harmless and self-expiring). Any NEW path that creates a session must regenerate
it and must not bypass the unverified check.

## Rule: register is enumeration-safe (no 409 on duplicate)
A duplicate email must return the SAME `202` shape as a fresh signup, never a
`409`/"already exists". For an active, still-unverified duplicate, resend a fresh
verification link so "check your email" stays truthful; otherwise send nothing.
Never establish a session on the duplicate path (so it can't take over an existing
account). The concurrent-signup race (unique-violation catch) returns `202` too.
The OpenAPI contract documents only `202` and explicitly promises this; keep
implementation and contract aligned. `resend-verification` is enumeration-safe the
same way.

**Why:** A 409 (or any "already exists") leaks which emails have accounts; the
contract promises only `202`, so the handler must never branch on existence in a
way the caller can observe (status, body, or a session).

## Rule: an elapsed trial is READ-ONLY, enforced server-side
Writability is decided by `billing.ts` `canWrite(org)`/`isReadOnly(org)`: internal
orgs write; `active`/`past_due` write; `trialing` writes iff `trialEndsAt > now`;
an elapsed `trialEndsAt` is read-only. Deliberate compatibility choice:
`trialing` with `trialEndsAt == null` is WRITABLE (avoids freezing default/seed
fixtures and the pre-verification org, which has no session anyway). Enforcement is
one middleware `blockWritesWhenReadOnly` mounted on `/compass` AFTER `billingRouter`
(so users can still upgrade) and the same guard on the top-level `/storage`
upload-url mint. A read-only write returns `402`. The client `readOnly` flag on
AuthUser drives only advisory banners/disabled buttons - never authorization.

**Why:** Server is the boundary; UI disables are advisory. Mounting order matters:
billing must precede the read-only gate or an expired trial could never upgrade.

**How to apply:** Any new Compass write route is covered automatically by sitting
inside the `/compass` engineRouter. Any NEW non-`/compass` write that mutates
tenant data must add the same read-only guard. `trialEndsAt == null` writability is
NOT a security boundary; keep it covered by `read-only-trial.safeguard.test.ts` so a
future session-creating path can't accidentally expose pre-verification writes.
