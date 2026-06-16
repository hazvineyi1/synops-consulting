---
name: Impersonation + white-label branding safety
description: Session-swap impersonation invariants and why host branding must never authorize.
---

# Impersonation safety

Impersonation is a privileged support tool implemented as a session-swap, not an
in-place mutation of `session.userId`.

## Invariants (do not regress)

- **Regenerate the session id on every identity transition.** Start, stop, AND
  `/auth/login` + `/auth/register` all call `regenerateSession()` before setting
  the new identity, then save.
  **Why:** assigning a new `userId` in place keeps the same session id (session
  fixation) and, worse, leaves a stale `impersonatorUserId` behind, so a later
  request (or a fresh login made while impersonated) still looks impersonated.
  **How to apply:** any new code path that changes who the session belongs to
  must regenerate, then set only the identity fields (`userId`/`role`), then save.

- **The real operator is `session.impersonatorUserId ?? session.userId`.** Verify
  THAT user is `super_admin` (from the DB) before allowing a start. Impersonation
  is super_admin-only even though the rest of the platform console is global
  (`actor.isGlobal` = admin + super_admin).
  **Why:** the console is read-mostly and admin already has full cross-tenant
  access; acting AS another user is the uniquely dangerous capability, so only it
  is narrowed to super_admin.

- **Refused targets:** another admin/super_admin, a deactivated user, yourself,
  and nesting (already impersonating). Encapsulated in the pure
  `decideImpersonationStart` so it is unit-testable without a DB.

- **Every privileged write needs `blockWhileImpersonating`.** Credentials, role
  changes, allocations, branding management, and anything destructive or
  security-relevant must carry the guard.
  **Why:** ordinary curriculum edits are intentionally allowed while impersonating
  (attributed to the REAL actor via `audit_events.impersonator_user_id`), but a
  privileged write performed while wearing someone else's identity is an
  escalation/forgery risk. A missing guard on a single new route reopens the hole.
  **How to apply:** add the guard in the same change that adds the route; do not
  rely on a path-prefix allowlist.

- **Start/stop/status are TOP-LEVEL authed routes** (not under `/compass`) so an
  impersonated user of any product can still stop.

## White-label branding is NOT authorization

Public `GET /branding` resolves the org by the normalized request Host
(lowercase, strip port/trailing dot, exact-match `organizations.domain`,
forwarded-host headers IGNORED) and returns only cosmetic fields with a neutral
fallback and `Cache-Control`.
**Why:** trusting the Host (or a forwarded-host header) to decide what a visitor
may see would let anyone re-point a hostname to read another tenant's branding or
gate.
**How to apply:** Host themes the page only. Authorization always flows through
session -> product -> actor/org scoping. Setting `domain` is global-only;
`school_admin` may edit its own org's name/tagline/accent/logo (accent hex, logo
https-or-relative) but never `domain`.
