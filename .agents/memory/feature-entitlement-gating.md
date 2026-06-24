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
- Assignment/edit/export gates and the read path are now BOTH enforced. The public
  host-resolved branding read (`GET /branding`) performs **non-destructive read-time
  revocation**: it folds billing state into the host-match query, computes the
  effective plan, and returns the neutral `{ branded:false, organization:null }` when
  `!features.customDomain || !features.whiteLabel`. The stored row is untouched, so a
  re-upgrade restores branding automatically. Check BOTH features (customDomain implies
  whiteLabel today, but a future tier reshuffle must not leak white-label fields).
  **Why a downgraded org keeps serving without this:** branding is loaded once and
  cached, so an assignment-time-only gate would let a lapsed org keep its white-label
  look indefinitely.
- **The branding read must never become a domain/tier oracle.** A matched-but-unentitled
  host returns the SAME neutral body as an unmatched host: no 402, no "exists but needs
  tier X" signal. Keep reading the raw `Host` header (never `X-Forwarded-Host`) so a
  client cannot spoof another tenant's branding. The endpoint stays cosmetic and never
  authorizes. Cache-Control is short (`public, max-age=60`) and the web
  branding-context staleTime matches it so a downgrade propagates within ~1 minute.
- **Surfacing entitlements in the global console:** the cross-org overview emits the
  EFFECTIVE tier/planLabel/features (via `planFor`), never the raw `planTier`, so admins
  see why an action is blocked. Feature availability in the UI must be conveyed by icon
  AND text (not color alone) for WCAG AA.
