# Synops Advisory Group

A public dual-practice consulting firm marketing site served at `/`, plus a
multi-product SaaS platform behind per-product branded logins. One web app (the
`uva-engine` artifact) hosts the marketing site and every product surface; one
Express API server (`api-server`) backs them all with a single shared auth
backend. Each user is bound to exactly one product (admins see all).

## Run & Operate

- `pnpm --filter @workspace/uva-engine run dev` - run the web app (Vite).
- `pnpm --filter @workspace/api-server run dev` - run the API server.
- `pnpm --filter @workspace/uva-engine run typecheck` - typecheck the web app (prefer this over `build` to verify; `build` needs workflow-provided `PORT`/`BASE_PATH`).
- `pnpm --filter @workspace/api-server run typecheck` - typecheck the API server.
- `pnpm run typecheck` - full typecheck across all packages.
- `pnpm --filter @workspace/api-spec run codegen` - regenerate API hooks + Zod schemas from the OpenAPI spec. Do NOT change the OpenAPI `info.title` (it controls generated filenames).
- `pnpm --filter @workspace/db run push` - push DB schema changes (dev only).

These normally run as Replit workflows; do not run `pnpm dev` at the repo root.
The api-server workflow does not always hot-reload route changes - restart it
after editing routes, then re-verify.

### Required env

- `DATABASE_URL` - Postgres connection string.
- `SESSION_SECRET` - express-session signing secret.

### Optional env

- `CONTACT_EMAIL` - recipient for contact-form and demo-request notifications.
- `SMTP_URL` / `RESEND_API_KEY` / `SENDGRID_API_KEY` - outbound email transport. If none is set, email **degrades to logging** the message instead of sending (forms still succeed and persist to the DB).
- `REPLIT_DOMAINS` - comma-separated allowed origins for the CSRF origin check in production.
- `LOG_LEVEL` - pino log level (default `info`).

No third-party API keys are required. Engines are rules-based; any optional LLM
use must sit behind an env fallback so the product works without it.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite, `wouter` v3 (routing), TanStack Query, Tailwind + shadcn/ui, `react-hook-form` + Zod, Recharts
- API: Express 5, `express-session` + `connect-pg-simple`, `bcryptjs`, `express-rate-limit`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `@workspace/api-client-react`
- Build: esbuild (API CJS bundle)

## Products

The platform is a registry of products. Each has a key, brand (name, accent
color, tagline), and vertical. All five products are built and gated:

- **Hub** (`hub`) - client portal: engagements, shared resources, request/message form, PHI notice. The only self-service-registration product. Admin surface reads all users and submissions.
- **Cadence** (`cadence`) - engagement command center: projects, milestones, deliverables with a QA gate (a deliverable cannot complete until its gate passes). Feeds the Hub engagements view.
- **Rise** (`rise`) - adaptive learning platform: level-aware (Elementary 3-5 / Secondary 6-12 / Higher Ed), Bayesian mastery, results + path chart; sessions persist to `learning_sessions`.
- **Compass** (`compass`) - curriculum engine: clients, projects, courses, objectives, assessments, standards frameworks, crosswalk links, and a QA report (save + markdown export). This is the original engine, rebranded and gated. **Multi-tenant and role-based:** every curriculum route lives under a single guarded `/compass` namespace and is organization-scoped (see Architecture decisions). The consulting firm's own work lives in the internal organization; external school tenants are isolated from it and from each other.
- **Meridian** (`meridian`) - provider operations portal: provider records, network-adequacy view, dispute queue (status/priority + appended notes attributed to the acting user).

## Where things live

- **Product registry (source of truth, two halves):** frontend `artifacts/uva-engine/src/lib/products.ts` (the `PRODUCTS` array with brand/vertical, plus `PRODUCT_MAP`/`getProduct` helpers); backend `artifacts/api-server/src/lib/products.ts` (`PRODUCT_KEYS`, `isProductKey`, `SELF_SERVICE_PRODUCT_KEYS`, `isSelfServiceProductKey`). Keep the two key lists in sync with the OpenAPI `ProductKey` enum.
- **DB schema (source of truth):** `lib/db/src/schema/{users,marketing,portal,cadence,learning,providers,organizations,clients,classes,allocations}.ts` (re-exported from `lib/db/src/index.ts`). `users.product_key` binds a user to a product; `users.organization_id` (nullable) and `clients.organization_id` (NOT NULL) carry tenancy. `classes` and `allocations` are model-only so far (no endpoints yet). Plus the connect-pg-simple `session` table. White-label columns live on `organizations` (`domain`, `logo_url`, `accent_color`, name, tagline). Privileged actions are recorded in `audit_events` (carries `impersonator_user_id`) and `impersonation_events` (start/stop), defined in `lib/db/src/schema/{audit,impersonation}.ts`.
- **Tenancy + roles (server):** `artifacts/api-server/src/lib/actor.ts` defines `ActorContext`, the role sets (`GLOBAL_ROLES`, `ORG_BOUND_ROLES`), and the `loadActorContext` middleware that resolves `req.actor`. `artifacts/api-server/src/lib/tenancy.ts` holds the org-scoping helpers (`getXOrgId`, `actorCanAccessOrg`, `denyCrossOrg`, `clientOrgFilter`, allocation-target checks) that EVERY Compass handler uses.
- **API contract (source of truth):** the OpenAPI spec in `@workspace/api-spec`. Generated client/hooks/schemas land in `lib/api-client-react/src/generated/`; the fetch wrapper is `lib/api-client-react/src/custom-fetch.ts`.
- **API routes:** `artifacts/api-server/src/routes/`. Auth (`auth.ts`) issues sessions and carries `productKey` on register/login/me. Per-product routers: `portal.ts` (Hub), `cadence.ts`, `rise.ts`, `meridian.ts`, plus the Compass engine routers (dashboard/clients/projects/courses/objectives/assessments/standards/qa/crosswalk). `index.ts` mounts the Compass routers inside ONE `engineRouter` at `/compass`, with `requireAuth` -> `requireProduct("compass")` -> `loadActorContext` applied once at its top (no path-prefix allowlist anymore). `engine.safeguard.test.ts` (vitest + supertest) guards against any curriculum route being served ungated. Auth helpers (`hash/verify`, `requireAuth`, `requireAdmin`, `requireProduct`) in `src/lib/auth.ts`. Email degrade-to-log in `src/lib/email.ts`. Startup seed in `src/lib/seed.ts`. Platform console + analytics + white-label management live in `console.ts` (`/admin/overview`, `/admin/report.md`, `/admin/users`, `PATCH /admin/organizations/:id/branding`), mounted INSIDE the `/compass` `engineRouter` and gated on `actor.isGlobal`. Public host-resolved branding is `routes/branding.ts` (`GET /branding`, mounted in the public section, never authorizes). Impersonation start/stop/status (`routes/impersonation.ts`) are TOP-LEVEL authed routes (not under `/compass`) so an impersonated non-Compass user can still stop; the pure decision is `src/lib/impersonation.ts` and the `blockWhileImpersonating` guard is in `src/lib/auth.ts`.
- **Web routing:** `artifacts/uva-engine/src/App.tsx` - public marketing routes, a `/portals` directory, legacy `/portal*` -> `/hub` redirects, and per-product routes generated from the registry: `/{key}`, `/{key}/login`, `/{key}/register` (each `/{key}` is a `wouter` `nest`). Auth context: `src/lib/auth-context.tsx`.
- **Per-product UI:** branded auth via `AuthShell` + `ProductLogin`/`ProductRegister`; the `ProtectedProduct` gate; `components/portal/ProductApp.tsx` maps a product key to its workspace component (Hub dashboard, `CadenceApp`, `RiseApp`, `MeridianApp`, Compass `EngineApp`/`Shell`). Product pages live under `src/pages/{portal,cadence,rise,meridian,...}/*`. The Compass `Shell` exposes a role-gated platform console (`src/pages/compass/Console.tsx`): cross-org overview, user directory, white-label branding management, an impersonation launcher, and platform report export. A persistent impersonation banner (driven by `auth-context`'s `impersonator`) lets the operator Stop. UI role helpers are in `src/lib/roles.ts` (`isGlobalAdmin`, `isSuperAdmin`, `canViewConsole`, `canImpersonate`); white-label is fetched by host and applied in `src/lib/branding-context.tsx` and themed through `AuthShell`.
- **Public marketing pages:** `artifacts/uva-engine/src/pages/public/*` (including `Portals.tsx`, the product directory grouped by vertical). Per-route SEO: `src/lib/seo.ts`.
- **Brand tokens / theme:** `artifacts/uva-engine/src/index.css`; per-product accent comes from the registry.

## Architecture decisions

- **One web artifact, many surfaces.** The marketing site (root) and every product login/dashboard live in the same Vite app. Each product is mounted under a `wouter` `nest` at `/{key}` so its internal links need no rewriting.
- **One shared auth backend; one product per user.** A single session/auth system serves all products. `users.product_key` binds each user to one product; admins (`role = "admin"`) bypass product checks and see all.
- **Server is the security boundary.** Every product API route is authorized server-side with `requireProduct(key)` (admin/super_admin bypass). The client-side `ProtectedProduct` gate is UX only. Compass engine routes live inside ONE `engineRouter` mounted at `/compass` with the gate applied once at its top (`requireAuth` -> `requireProduct("compass")` -> `loadActorContext`); Hub/Cadence/Rise/Meridian self-gate per-route or per-router. See `.agents/memory/product-route-gating.md`.
- **Compass is multi-tenant; the organization is the boundary.** `organizations` roots tenancy at `clients.organization_id` (NOT NULL); everything below inherits it through the client. Roles: `admin`/`super_admin` are global (see all tenants, bypass `requireProduct`); `school_admin`/`builder` are bound to a concrete org (denied 403 by `loadActorContext` if they have none). EVERY Compass handler is org-scoped via `tenancy.ts`: lists filter by the actor's org (`clientOrgFilter`), and by-id/nested access returns **404** on cross-org (via `denyCrossOrg`, 404 not 403 to avoid leaking existence). Client creation copies the actor's org; the client never supplies `organizationId`. Standards frameworks/competencies are shared (global, NOT org-scoped); crosswalk links ARE scoped. See `.agents/memory/compass-multitenancy.md`.
- **Self-service registration is opt-in per product.** `POST /auth/register` only accepts product keys in `SELF_SERVICE_PRODUCT_KEYS` (currently Hub); all other products are admin-provisioned. The server never trusts an arbitrary client-supplied `productKey`. See `.agents/memory/self-service-registration.md`.
- **No required API keys.** Engines are rules-based; optional LLM features must degrade gracefully behind an env fallback.
- **Contract-first.** Routes validate input/output with Zod; the web app consumes generated React Query hooks. Regenerate after spec changes.
- **Email never blocks a form.** Submissions persist to the DB first; notification email is best-effort and logs when no transport is configured.
- **Impersonation is a session-swap, regenerated both ways.** Start/stop call `regenerateSession()` (new session id, defeats fixation) and persist `{ userId: target, impersonatorUserId: real }`. The real operator (resolved as `session.impersonatorUserId ?? session.userId`) must be `super_admin`. Refused targets: admin/super_admin, deactivated, self, and nesting. While impersonating, every credential/security/branding write is refused by `blockWhileImpersonating`; ordinary curriculum edits are allowed but attributed to the REAL actor via `audit_events.impersonator_user_id`. Start/stop/status are TOP-LEVEL authed routes so an impersonated non-Compass user can still stop. `/auth/login` and `/auth/register` also regenerate the session, so logging in during an impersonated session cannot leave a stale impersonator marker. See `.agents/memory/impersonation-safety.md`.
- **White-label branding is cosmetic, never authorization.** Public `GET /branding` resolves the org by normalized request Host (lowercase, strip port/trailing dot, exact-match `organizations.domain`, forwarded-host headers ignored) and returns only presentational fields with a neutral fallback and `Cache-Control`. The Host header NEVER grants access; authorization stays session/product/actor based. Setting `domain` is global-only; `school_admin` edits name/tagline/accent/logo for its OWN org (accent must be hex; logo must be https or relative).
- **The platform console is global; only impersonation is super_admin-only.** Cross-org overview, user directory, and branding management are gated on `actor.isGlobal` (admin + super_admin) per the design constraint; only impersonation is narrowed to `super_admin`. `admin` already has full cross-tenant access on every Compass route, so the console exposes nothing new to it; the dangerous capability (acting as another user) is the one restricted.

## Dev credentials (seeded)

Idempotent seed functions run on server start (`src/lib/seed.ts`, wired in
`src/index.ts`, in dependency order): `ensureOrganizationsSeed` (the internal
organization, **always runs in every env**, and adopts pre-existing null-org
compass users into it), `ensurePortalSeed` (portal resources, always runs),
`ensureDemoUsers`, and `ensureMeridianSeed` (synthetic providers/reviews/disputes).
The latter two are **skipped when `NODE_ENV=production`**, so demo users and
Meridian synthetic data exist in dev only. Organizations:

- Internal tenant: org slug `synops-internal` (type `internal`) - the consulting
  firm's own curriculum; all backfilled/legacy clients and the compass demo user
  live here.
- Demo school tenant (dev only): org slug `demo-academy` (type `school`) - used
  to demonstrate org isolation.

Demo users (password for all: `Demo!2345`):

- Admin: `admin@demo.synops.test` (role `admin`, global).
- Per product: `{key}@demo.synops.test` (e.g. `cadence@demo.synops.test`). The
  `compass@demo.synops.test` client is bound to the internal org.
- Role-based Compass accounts: `super-admin@demo.synops.test` (role
  `super_admin`, global, no org), `school-admin@demo.synops.test` (role
  `school_admin`, demo-academy org), `builder@demo.synops.test` (role `builder`,
  demo-academy org).

## Product

- Public marketing site: Home, About, Healthcare, Learning, Platforms, Government, Insights (+ article), Contact, and a `/portals` product directory.
- A public, rules-based **Adaptive Reading & Reasoning** demo (seeded item bank, no login) on the Platforms page: one unified adaptive assessment spanning all four reading skills (main idea, inference, vocabulary in context, evaluate argument), with a live learner-model panel and a per-skill result profile. No level picker.
- Per-product branded logins and dashboards as listed under **Products**.
- A global/super-admin platform console inside Compass: cross-organization overview and a platform report (markdown export), a user directory, audited user impersonation (super_admin only) with a persistent Stop banner, and per-organization white-label branding management.
- White-label by custom domain: pointing a school's domain at the app shows its name, logo, and accent on the product login (see Custom domains below). The host is cosmetic only and never grants access.

## User preferences

- No emojis in UI copy or content.
- No em dashes in UI copy or content.
- Accessibility target: WCAG 2.1 AA.

## Gotchas

- **wouter nesting:** inside a product nest (`/{key}`, including ProtectedProduct, dashboards, the Compass Shell), links/redirects must be **absolute** (`~/...`) or relative to the nest. A plain `/{key}/...` from inside the nest resolves to `/{key}/{key}/...`. Top-level pages (the product Login/Register routes, PublicLayout) use plain paths.
- **Post-auth redirect is state-driven.** Login/Register redirect via `if (user) return <Redirect to=... />`, NOT an imperative `navigate()` in the submit handler. Imperative navigation races the auth-context re-render: it mounts the product before `user` propagates and bounces the visitor back to login.
- **Product authorization must cover EVERY route.** Compass no longer uses a path-prefix allowlist (an earlier gap was `DELETE /crosswalk-links/:id` under an unlisted prefix). Every curriculum route must be mounted INSIDE the `/compass` `engineRouter` so the gate + `loadActorContext` apply once; `engine.safeguard.test.ts` fails if any curriculum route is reachable ungated. A new Compass handler must also be org-scoped via `tenancy.ts` (list filter + `denyCrossOrg`) or it leaks across tenants.
- **Demo difficulty is 1-5** (not 0-1). The adaptive logic targets harder/easier items on that scale, and `masteryEstimate` is sent to the API as an **integer 0-100**.
- **Public demo runs a single adaptive track.** The bank is one unified pool; next-item selection adapts difficulty AND prefers untested skills so one run spans all four areas. The `level` field on `/demo/bank` and `/demo/sessions` is kept only to satisfy the API contract (fixed internally to `secondary`) and is never shown to users.
- **curl the API** through the shared proxy: `localhost:80/api/...` with `-H 'Origin: http://localhost'` and a cookie jar for session routes. Compass curriculum routes are under `/api/compass/...`. Auth matrix to verify gating: product user -> own routes 200, -> other product 403, admin -> everything 200/404. Tenancy matrix: org-bound user -> own org 200 and other org by-id **404** (not 403), lists scoped to own org; global roles (admin/super_admin) see all.
- **Express 5 `req` augmentation:** add custom request properties (e.g. `req.actor`) via `declare global { namespace Express { interface Request { ... } } }`. The `express-serve-static-core` module augmentation did NOT merge here and caused TS2339 on every handler. See `.agents/memory/compass-multitenancy.md`.
- **Impersonation safety lives in the session lifecycle.** Any auth transition that changes who you are (`/auth/login`, `/auth/register`, impersonation start/stop) must `regenerateSession()` so a stale `impersonatorUserId` can never survive. Every NEW privileged write (credentials, roles, allocations, branding, anything destructive or security-relevant) must carry `blockWhileImpersonating`, or an operator could perform it while wearing another user's identity. See `.agents/memory/impersonation-safety.md`.
- **Host branding is cosmetic only.** `GET /branding` reads the raw request Host (forwarded-host headers ignored) purely to theme the login. Never use the Host (or anything in the branding payload) to authorize; authorization is always session/product/actor based.
- **Impersonation curl matrix:** super_admin start (`POST /api/impersonation/start {userId}`) -> `me.impersonator` set; a privileged write (e.g. branding PATCH) returns 403 while impersonating; `POST /api/impersonation/stop` restores the operator; logging in again clears the marker (`me.impersonator=null`, later stop 400). Console matrix: admin + super_admin 200, school_admin + builder 403 on `/api/compass/admin/{overview,report.md,users}`.

## Custom domains / white-label (deploy-time)

White-label is resolved at request time from the visitor's Host, so a school sees its own branding only when it reaches the app on a domain that matches its `organizations.domain` row. To onboard a custom domain:

1. Add the domain to the Replit Deployment (Deployments -> Settings -> Custom domains) and create the DNS records Replit shows (an `A`/`ANAME` or `CNAME` plus the `TXT` verification record) at the domain's registrar. Wait for verification and certificate issuance.
2. Add the same domain (lowercase, no scheme, no port) to `REPLIT_DOMAINS` so the production CSRF origin check accepts it.
3. Set the org's `domain` to the exact host (global/super_admin only: `PATCH /compass/admin/organizations/:id/branding` with `{ "domain": "academy.example.org" }`). Matching is exact and case-insensitive; subdomains are not wildcarded.
4. Set the org's `name`, `tagline`, `accentColor` (hex), and `logoUrl` (https or a relative asset path) the same way. `school_admin` can manage these for its own org but cannot change `domain`.

Visitors on an unmatched host get the neutral default branding. The Host only themes the page; it never grants access.

## Not yet implemented (stubs to be aware of)

- **Admin creation is manual.** There is no bootstrap endpoint; promote a user by setting `users.role = 'admin'` directly in the DB (the seeded admin exists in dev only). Non-self-service products are likewise provisioned by setting `users.product_key`.
- **Password reset** is not built (the login form shows a "coming soon" note).
- **Resource file uploads** are not built; `portal_resources.url` may be a placeholder (`#`).
- **PHI:** Hub portal messages are plain text with a notice asking clients not to submit PHI; there is no PHI-grade encryption/handling.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Durable lessons: `.agents/memory/product-route-gating.md`, `.agents/memory/self-service-registration.md`, `.agents/memory/compass-multitenancy.md`, `.agents/memory/impersonation-safety.md`.
