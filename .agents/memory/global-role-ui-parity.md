---
name: global-role UI parity
description: Client gates and org-scoped UI must match the server's global-role (admin/super_admin) authorization, or global roles get UI-blocked from surfaces they can actually use.
---

The client-side product/role gates are UX only, but they must stay in lockstep
with the server's authorization for the GLOBAL roles (`admin` and `super_admin`).
Two recurring traps:

1. **Product bypass parity.** The server's `requireProduct` bypasses for BOTH
   `admin` and `super_admin`. Any client gate that decides "can this user enter
   this product?" must bypass for both too. Checking only `role === "admin"`
   silently blocks `super_admin` (who is not bound to a product) from a product
   they are authorized for. Use the shared `isGlobalAdmin(role)` helper, never a
   bare string compare.

2. **Org-scoped surfaces need an explicit tenant selector for global roles.**
   Global roles are NOT bound to an organization, so any org-scoped view (school
   report, anything that resolves the actor's org) cannot infer a tenant for
   them. The server returns 400 when a global role calls an org-scoped endpoint
   with no org id. The UI must let global roles supply the org id explicitly and
   gate the query until they do; org-bound roles (e.g. `school_admin`) fetch
   their own org with no param.

**Why:** caught in review. School-report nav/route was gated `school_admin`-only
and `ProtectedProduct` bypassed only `admin`; both excluded `super_admin`/global
admins from things the backend actually authorizes.

**How to apply:** when adding a Compass surface, decide gating with the role
helpers in `uva-engine/src/lib/roles.ts` (`isGlobalAdmin`/`canManageSchool`/...).
There is no organization-directory endpoint, so the tenant selector for global
roles is a raw numeric org-id input (same pattern as builder creation), not a
dropdown.
