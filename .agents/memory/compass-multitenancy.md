---
name: Compass multi-tenancy & roles
description: How the Compass curriculum engine is made multi-tenant and role-based, and the Express Request augmentation gotcha that bit during it.
---

# Compass multi-tenancy

The Compass curriculum engine is multi-tenant. `organizations` is the tenant
boundary; the curriculum tree roots at `clients.organization_id` (NOT NULL) and
everything below (projects, courses, etc.) inherits tenancy through the client.
`users.organization_id` is nullable.

**Rule:** every Compass route lives under ONE guarded namespace. The engine
router is mounted at `/compass` with the gate applied once at its top
(`requireAuth` -> `requireProduct("compass")` -> `loadActorContext`), then all
curriculum sub-routers are mounted inside it. Do NOT reintroduce a path-prefix
allowlist (the old `COMPASS_ENGINE_PATHS`): a new prefix could be left wide open.
A route added inside the engine router is automatically authed, product-gated,
and org-aware.

**Why:** the previous per-prefix gate left real gaps (a route under a new prefix
was ungated). A single mount point makes ungated curriculum routes structurally
impossible.

**How to apply:**
- Org scoping lives in `tenancy.ts` and must wrap EVERY handler: list endpoints
  filter by `clientOrgFilter` (a global actor gets no filter; a non-global actor
  with null org gets `sql\`false\``); by-id / nested endpoints call
  `denyCrossOrg(res, req.actor!, await getXOrgId(id), msg)` which returns 404 on
  cross-org access (404, not 403, to avoid leaking existence).
- `POST /clients` sets `organizationId = actor.organizationId` (400 if the actor
  has no org). The client never supplies `organizationId`.
- Roles: `admin`/`super_admin` are GLOBAL (bypass org and `requireProduct`);
  `school_admin`/`builder` are org-bound and 403 at `loadActorContext` if they
  have no org. Standards frameworks/competencies stay global (shared), so they
  are NOT org-scoped; crosswalk links ARE.
- The internal consulting tenant (org slug `synops-internal`, type `internal`)
  is seeded in ALL envs by `ensureOrganizationsSeed`; pre-existing compass users
  with null org are adopted into it so the internal flow survives the upgrade.

# Express 5 Request augmentation gotcha

To add a custom property to `req` (e.g. `req.actor`), augment via
`declare global { namespace Express { interface Request { ... } } }`. Augmenting
`declare module "express-serve-static-core"` did NOT merge with Express 5's
types here — `req.actor` was reported as "does not exist" on every handler.

**Why:** @types/express 5 surfaces the request type through the global `Express`
namespace; the module-path augmentation didn't reach the type the route handlers
actually see.

**How to apply:** put the global augmentation in a file that is already imported
into the program (e.g. `lib/actor.ts`), and verify with `pnpm run typecheck`,
not the editor.
