---
name: Feature entitlement gating
description: How per-plan FEATURE entitlements (whiteLabel, multiAccreditorExport, customDomain) are gated in Compass, and the ordering/policy rules any future feature gate must follow.
---

# Per-plan feature entitlement gating

Compass plans model boolean FEATURES (not just quotas). The enforced ones:
`whiteLabel` + `multiAccreditorExport` require `professional`+; `customDomain`
requires `enterprise`. A refusal is `402 { error:"upgrade_required", feature,
requiredTier, message }` (the `message` is human-readable, ASCII only).

## The two rules every feature gate must follow

1. **402 runs AFTER existence/scope checks, never before.** Place the entitlement
   check after `denyNoScope` / `actorCanAccessOrg` / `denyBuilderWrite` and after
   any no-op short-circuit. A resource the actor cannot see (or that does not
   exist, or a cross-org id) must stay **404**, never become a **402** -- a 402 on
   an unreachable id leaks that it exists and which tier it needs.
   **Why:** a probe that returns 402-vs-404 is an existence oracle across tenants.

2. **Global-bypass vs target-org is per-feature, decided by what the feature
   protects.**
   - Cosmetic/throughput features served *on behalf of* a client (`whiteLabel`
     branding edits, `multiAccreditorExport` exports): **globals bypass**; org-bound
     actors are gated by *their own* org's effective tier. Internal staff serve
     client orgs, so blocking them is wrong.
   - Durable tenant *config* that persists past the request (`customDomain`
     assignment): enforced on the **TARGET org even for globals**, because the
     config outlives the operator and must match the org's plan. Clearing such
     config (empty domain) is always allowed so a downgraded org can still remove
     a host it can no longer use.
   **Why:** "who is acting" decides ephemeral service actions; "whose durable row
   is this" decides persistent config.

## How to apply

- Read-only helper `orgHasFeature(orgId, feature, exec=db)` resolves the org's
  effective tier (no advisory lock; it is a check, not a metered mutation -- unlike
  the metering path which must lock+count+mutate atomically).
- Frontend surfaces the 402: prefer the response `message` over the short `error`
  code, and for binary/export links fetch the resource (not a plain `<a href>`) so
  a 402 becomes an upgrade prompt instead of navigating to a raw error body.
- This implementation gates *assignment/edit/export* operations only. It does NOT
  revoke already-configured branding/domain at read time after a downgrade. If
  immediate revocation is ever required, gate the read path (`GET /branding`,
  domain resolution) or clear the config on downgrade -- that is a separate
  decision, intentionally out of the assignment-gating scope.
