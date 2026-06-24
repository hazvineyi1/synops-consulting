# Synops Advisory Group

A public consulting firm marketing site at `/`, plus a single gated SaaS product,
**Compass** (user-facing label **Curriculum Builder**), behind a branded login.
One web app (the `uva-engine` artifact) hosts both the marketing site and the
product; one Express API server (`api-server`) backs them with a single shared
auth backend. `users.product_key` binds each user to a product (currently only
`compass`); global admins see all.

The product-registry architecture (a registry, a per-product auth gate, and the
`product_key` binding) is kept even with a single product, so more products can
be reintroduced without reworking the auth boundary.

## Run & Operate

- `pnpm --filter @workspace/uva-engine run dev` - web app (Vite).
- `pnpm --filter @workspace/api-server run dev` - API server.
- `pnpm run typecheck` - full typecheck; or `--filter` a single package. Prefer
  `typecheck` over `build` to verify (`build` needs workflow-provided `PORT`/`BASE_PATH`).
- `pnpm --filter @workspace/api-spec run codegen` - regenerate API hooks + Zod
  schemas from the OpenAPI spec. Do NOT change the OpenAPI `info.title` (`Api`);
  it controls generated filenames.
- `pnpm --filter @workspace/db run push` - push DB schema (dev only; `push-force`
  skips the destructive-drop confirm).

These run as Replit workflows; do not run `pnpm dev` at the repo root. The
api-server workflow does not reliably hot-reload route changes - restart it after
editing routes, then re-verify.

### Env

- Required: `DATABASE_URL`, `SESSION_SECRET`.
- Optional: `CONTACT_EMAIL` (recipient for contact-form notifications);
  `CONTACT_FROM_EMAIL` (sender; must be an address on a Resend-verified domain.
  Defaults to Resend's onboarding sender, which only delivers to the Resend account
  owner); `REPLIT_DOMAINS` (prod CSRF allowed origins); `LOG_LEVEL` (pino, default
  `info`); `REQUIRE_EMAIL_VERIFICATION` (default on; set `0`/`false` only as an
  emergency kill-switch that lets register sign users in without confirming their
  email - logs a loud warning in prod).
- Email transport is the Resend connector (a Replit integration, called via
  `@workspace/api-server`'s `@replit/connectors-sdk`); there is no API-key env var.
  If `CONTACT_EMAIL` is unset or the Resend send fails, email degrades to logging and
  forms still persist. To deliver to an arbitrary address, verify the sending domain
  at resend.com/domains and set `CONTACT_FROM_EMAIL` to an address on it.
- No third-party API keys required. Engines are rules-based; any optional LLM use
  must sit behind an env fallback so the product works without it.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite, `wouter` v3, TanStack Query, Tailwind + shadcn/ui,
  `react-hook-form` + Zod, Recharts
- API: Express 5, `express-session` + `connect-pg-simple`, `bcryptjs`, `express-rate-limit`
- DB: PostgreSQL + Drizzle ORM; Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (OpenAPI spec) -> `@workspace/api-client-react`; Build: esbuild (API CJS)

## Product (Compass / "Curriculum Builder")

One gated product. It keeps the internal key `compass` and internal symbols
(`EngineApp`, `engineRouter`, the `/compass` namespace, the `compass` `ProductKey`);
only the user-facing label is **Curriculum Builder**. When relabeling, change
user-facing copy only; do NOT rename those internal symbols.

It is a curriculum engine: clients, projects, courses, objectives, assessments,
standards frameworks, crosswalk links, per-project time tracking, and a QA report
(save + markdown export). Multi-tenant and role-based (see Architecture decisions).

The four earlier products (Hub, Cadence, Rise, Meridian) were removed entirely
(routes, pages, DB tables, OpenAPI paths/schemas, seeds). The `ProductKey` enum is
`[compass]`.

## Where things live

- **Product registry (source of truth):** frontend
  `artifacts/uva-engine/src/lib/products.ts` (`PRODUCTS` + `PRODUCT_MAP`/`getProduct`;
  compass `title` is "Curriculum Builder"); backend
  `artifacts/api-server/src/lib/products.ts` (`PRODUCT_KEYS = ["compass"]`,
  `SELF_SERVICE_PRODUCT_KEYS = ["compass"]`, guards). Keep both key lists in sync with the
  OpenAPI `ProductKey` enum.
- **DB schema (source of truth):** `lib/db/src/schema/*` re-exported from
  `lib/db/src/index.ts`. Tenancy columns: `users.organization_id` (nullable),
  `clients.organization_id` (NOT NULL). `marketing.ts` also holds public-demo
  `demo_sessions` and contact/demo-request tables. White-label columns live on
  `organizations`. Privileged actions recorded in `audit_events` (carries
  `impersonator_user_id`) and `impersonation_events`. `classes`/`allocations` are
  model-only (no endpoints yet). Plus the connect-pg-simple `session` table.
- **Tenancy + roles (server):** `src/lib/actor.ts` (`ActorContext`, role sets,
  `loadActorContext` middleware resolving `req.actor`); `src/lib/tenancy.ts`
  (org-scoping helpers every Compass handler uses: list filters,
  `denyCrossOrg`/`denyNoScope`, scope resolvers).
- **API contract (source of truth):** OpenAPI spec in `@workspace/api-spec`.
  Generated client/hooks/schemas in `lib/api-client-react/src/generated/`; fetch
  wrapper `lib/api-client-react/src/custom-fetch.ts`.
- **API routes:** `artifacts/api-server/src/routes/`. Public/shared: `auth.ts`
  (sessions, `productKey` on login/me; self-serve trial register open for compass),
  `demo.ts` (public adaptive
  demo), `branding.ts` (`GET /branding`, host-resolved, never authorizes),
  `contact.ts`, health. All Compass engine routers mount inside ONE `engineRouter`
  at `/compass`, with `requireAuth` -> `requireProduct("compass")` ->
  `loadActorContext` applied once at its top. Platform console (`console.ts`:
  overview/report.md/users/branding) is inside `/compass`, gated on `actor.isGlobal`.
  Impersonation start/stop/status (`impersonation.ts`) are TOP-LEVEL authed routes;
  decision logic in `src/lib/impersonation.ts`, `blockWhileImpersonating` in
  `src/lib/auth.ts`. Auth helpers, email degrade-to-log, and startup seed in
  `src/lib/{auth,email,seed}.ts`. `engine.safeguard.test.ts` guards against any
  curriculum route being served ungated.
- **Web routing:** `artifacts/uva-engine/src/App.tsx` - public marketing routes, a
  `/portals` directory, and per-product routes from the registry (`/{key}`,
  `/{key}/login`, `/{key}/register`; each `/{key}` is a `wouter` `nest`). Auth
  context: `src/lib/auth-context.tsx`.
- **Per-product UI:** branded auth via `AuthShell` + `ProductLogin`/`ProductRegister`;
  the `ProtectedProduct` gate; `components/portal/ProductApp.tsx` maps the key to its
  workspace (compass -> `EngineApp`/`Shell`). Compass pages under `src/pages/compass/*`
  plus shared engine pages. The Compass `Shell` exposes the role-gated platform
  console (`Console.tsx`) and a persistent impersonation Stop banner. Role helpers:
  `src/lib/roles.ts`; white-label fetched by host in `src/lib/branding-context.tsx`.
  Shared layout primitives: `src/lib/stages.ts` (the 4 pipeline stages
  Intake/Design/QA/Handoff), `src/components/engine/ProjectWorkspace.tsx` (shared
  render-prop frame for single-project pages: loads the project once, renders
  breadcrumb/title/stage badge/StageRail, guards access to not-yet-reached stages -
  server stays the real boundary), `StageRail.tsx`, `PageHeader.tsx`.
- **Public marketing pages:** `src/pages/public/*` (incl. `Portals.tsx`). Per-route
  SEO: `src/lib/seo.ts`. Brand tokens/theme: `src/index.css` (accent from registry).

## Architecture decisions

- **One web artifact, many surfaces.** Marketing site (root) and product
  login/dashboard live in the same Vite app; the product is a `wouter` `nest` at
  `/{key}` (`/compass`) so internal links need no rewriting.
- **One shared auth backend; one product per user.** `users.product_key` binds each
  user; `admin`/`super_admin` are global and bypass product checks.
- **Server is the security boundary.** Every product route is authorized server-side;
  the client `ProtectedProduct` gate is UX only. Compass routes live inside ONE
  `engineRouter` with the gate applied once at its top. See
  `.agents/memory/product-route-gating.md`.
- **Compass is multi-tenant; the organization is the boundary.** Tenancy roots at
  `clients.organization_id` (NOT NULL); everything inherits it through the client.
  `admin`/`super_admin` global; `school_admin`/`builder` bound to a concrete org
  (403 if none). EVERY handler is org-scoped via `tenancy.ts`: lists filter by the
  actor's org; by-id/nested cross-org access returns **404** (not 403, to avoid
  leaking existence). Client creation copies the actor's org (never client-supplied).
  Standards frameworks/competencies are shared/global; crosswalk links are scoped.
  See `.agents/memory/compass-multitenancy.md`.
- **Self-service trial registration is open for compass, gated by email
  verification.** `SELF_SERVICE_PRODUCT_KEYS` is `["compass"]`. `POST /auth/register`
  transactionally creates a new `school`-type organization (planTier `trial`,
  `trialing`, `trialEndsAt` **null**) and an UNVERIFIED `school_admin` user, sends a
  verification email, and returns `202 {ok,email,verificationRequired}` with NO
  session, NO Stripe customer, and NO first client. The 14-day trial clock
  (`trialEndsAt` = now+14d), the auto-created first client, the Stripe customer, and
  the session are all established at `POST /auth/verify-email` (single-use,
  sha256-hashed, 24h token). `POST /auth/login` returns `403 code email_unverified`
  until verified; `POST /auth/resend-verification` re-sends. Register is
  enumeration-safe (a duplicate returns the same `202`, never `409`; an active
  unverified duplicate triggers a resend) and rate-limited tighter than login. The
  server FORCES `productKey=compass`, `role=school_admin`, and a server-generated org
  + slug, never trusting client-supplied values. Any product outside the allowlist is
  still 403 and admin-provisioned. The `REQUIRE_EMAIL_VERIFICATION` env kill-switch
  (default on) skips confirmation in emergencies. See
  `.agents/memory/self-service-registration.md`.
- **An elapsed trial is read-only, server-enforced.** `billing.ts`
  `canWrite(org)`/`isReadOnly(org)`: internal writes; `active`/`past_due` write;
  `trialing` writes iff `trialEndsAt > now`; an elapsed `trialEndsAt` is read-only;
  `trialing` with `trialEndsAt == null` is writable (avoids freezing seed/default
  fixtures and the pre-verification org, which has no session anyway). Enforcement is
  one `blockWritesWhenReadOnly` middleware on `/compass`, mounted AFTER `billingRouter`
  (so an expired trial can still upgrade), plus the same guard on the top-level
  `/storage` upload-url mint; a blocked write returns `402`. The AuthUser `readOnly`
  flag drives only advisory UI; the server is the boundary.
- **Contract-first.** Routes validate input/output with Zod; the web app consumes
  generated hooks. Regenerate after spec changes; never change `info.title`.
- **Email never blocks a form.** Submissions persist first; the notification email is
  best-effort via the Resend connector and degrades to logging when `CONTACT_EMAIL` is
  unset or the send fails.
- **Impersonation is a session-swap, regenerated both ways.** Start/stop call
  `regenerateSession()` and persist `{ userId: target, impersonatorUserId: real }`.
  The real operator must be `super_admin`. Refused targets: deactivated, self,
  nesting (a super admin may impersonate any other active account including other
  admins and super admins). While impersonating, every credential/security/branding
  write is refused by `blockWhileImpersonating`; ordinary edits are allowed but
  attributed to the REAL actor. `/auth/login` and `/auth/register` also regenerate the
  session so no stale impersonator marker survives. See
  `.agents/memory/impersonation-safety.md`.
- **White-label branding is cosmetic, never authorization.** `GET /branding` resolves
  the org by normalized request Host (forwarded-host headers ignored) and returns only
  presentational fields with a neutral fallback. The Host NEVER grants access. Setting
  `domain` is global-only; `school_admin` edits name/tagline/accent/logo for its OWN org
  (accent hex; logo https or relative).
- **The platform console is global; only impersonation is super_admin-only.** Overview,
  user directory, and branding management are gated on `actor.isGlobal`; only
  impersonation (acting as another user) is narrowed to `super_admin`.

## Product surfaces

- Public marketing site: Home, About, Healthcare, Learning, Platforms, Government,
  Insights (+ article), Contact, and a `/portals` product directory.
- A public, rules-based **Adaptive Reading & Reasoning** demo (no login) on the
  Platforms page: one unified adaptive assessment across four reading skills with a
  live learner-model panel and per-skill result profile. Independent of any product
  (`routes/demo.ts` + `lib/demoBank.ts` + `demo_sessions`).
- The Compass (Curriculum Builder) branded login and dashboard.
- A global/super-admin platform console inside Compass: cross-org overview + markdown
  report, user directory, audited impersonation (super_admin only) with a Stop banner,
  and per-org white-label branding management.
- White-label by custom domain (cosmetic only; never grants access).

## Dev credentials (seeded)

Idempotent seeds run on server start (`src/lib/seed.ts`):
`ensureOrganizationsSeed` (the internal org, always; adopts pre-existing null-org
compass users into it) and `ensureDemoUsers` (skipped when `NODE_ENV=production`).

Single tenant: org slug `synops-internal` (type `internal`).

Example accounts (password for all: `Demo!2345`):

- `super-admin@demo.synops.test` (role `super_admin`, global).
- `builder@demo.synops.test` (role `builder`, synops-internal org).

## User preferences

- No emojis in UI copy or content.
- No em dashes in UI copy or content.
- Accessibility target: WCAG 2.1 AA.

## Gotchas

- **wouter nesting:** inside the product nest (`/compass`), links/redirects must be
  absolute (`~/...`) or relative to the nest; a plain `/compass/...` resolves to
  `/compass/compass/...`. Top-level pages use plain paths.
- **Post-auth redirect is state-driven.** Login/Register redirect via
  `if (user) return <Redirect .../>`, NOT an imperative `navigate()` - imperative
  navigation races the auth-context re-render and bounces the visitor back to login.
- **Product authorization must cover EVERY route.** No path-prefix allowlist; every
  curriculum route must be mounted INSIDE the `/compass` `engineRouter` (gate +
  `loadActorContext` apply once), and be org-scoped via `tenancy.ts` (list filter +
  `denyCrossOrg`/`denyNoScope`) or it leaks across tenants. `engine.safeguard.test.ts`
  fails if any curriculum route is reachable ungated.
- **Removed-product paths 401 anon / 404 authed.** A trailing pathless
  `router.use(requireAuth)` (guarding the top-level impersonation router) intercepts any
  unmatched path. Both confirm the route is gone. (There are no `/rise`, `/cadence`,
  `/portal`, `/meridian`, or top-level `/admin/*` routes.)
- **Public demo:** difficulty is 1-5 (not 0-1); `masteryEstimate` is sent as an integer
  0-100. One unified adaptive pool that adapts difficulty AND prefers untested skills;
  the `level` field exists only to satisfy the API contract (fixed to `secondary`,
  never shown).
- **curl the API** through the shared proxy: `localhost:80/api/...` with
  `-H 'Origin: http://localhost'` and a cookie jar for session routes. Compass routes
  under `/api/compass/...`. Tenancy matrix: org-bound user -> own org 200, other org
  by-id **404**, lists scoped to own org; global roles see all. Console at
  `/api/compass/admin/{overview,report.md,users}`: admin + super_admin 200,
  school_admin + builder 403.
- **Express 5 `req` augmentation:** add custom request props (e.g. `req.actor`) via
  `declare global { namespace Express { interface Request { ... } } }`. The
  `express-serve-static-core` augmentation did NOT merge here. See
  `.agents/memory/compass-multitenancy.md`.
- **Drizzle wraps the pg driver error.** A Postgres SQLSTATE (e.g. `23505`
  unique_violation) may sit on `err.cause`, not `err` - unwrap the cause chain to map a
  DB constraint to a 4xx. See `.agents/memory/drizzle-pg-error-codes.md`.
- **Marketing-copy false positives when pruning products.** Normal words that look like
  product names: "enterprise" (contains "rise"), "review/communication cadence",
  "Rise 360" (an Articulate tool on Learning.tsx), "Principal hubs"/"hub". Do not delete
  these.

## Custom domains / white-label (deploy-time)

White-label is resolved at request time from the visitor's Host, so a school sees its
branding only on a domain matching its `organizations.domain` row. To onboard:

1. Add the domain to the Replit Deployment (Settings -> Custom domains) and create the
   DNS records Replit shows. Wait for verification and certificate issuance.
2. Add the same domain (lowercase, no scheme/port) to `REPLIT_DOMAINS` for the prod CSRF
   origin check.
3. Set the org's `domain` to the exact host (global/super_admin only, via
   `PATCH /compass/admin/organizations/:id/branding`). Matching is exact and
   case-insensitive; no subdomain wildcards.
4. Set the org's `name`, `tagline`, `accentColor` (hex), `logoUrl` (https or relative)
   the same way. `school_admin` can manage these for its own org but not `domain`.

Visitors on an unmatched host get the neutral default branding.

## Not yet implemented

- **Admin creation is manual.** No bootstrap endpoint; promote by setting
  `users.role = 'admin'` directly (seeded admin is dev-only). All users are provisioned
  by setting `users.product_key` (= `compass`) and a password directly.
- **Password reset** is not built (the login form shows a "coming soon" note).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and packages.
- Durable lessons: `.agents/memory/` - `product-route-gating.md`,
  `self-service-registration.md`, `compass-multitenancy.md`, `impersonation-safety.md`,
  `drizzle-pg-error-codes.md`.
