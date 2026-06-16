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
- **Compass** (`compass`) - curriculum engine: clients, projects, courses, objectives, assessments, standards frameworks, crosswalk links, and a QA report (save + markdown export). This is the original engine, rebranded and gated.
- **Meridian** (`meridian`) - provider operations portal: provider records, network-adequacy view, dispute queue (status/priority + appended notes attributed to the acting user).

## Where things live

- **Product registry (source of truth, two halves):** frontend `artifacts/uva-engine/src/lib/products.ts` (the `PRODUCTS` array with brand/vertical, plus `PRODUCT_MAP`/`getProduct` helpers); backend `artifacts/api-server/src/lib/products.ts` (`PRODUCT_KEYS`, `isProductKey`, `SELF_SERVICE_PRODUCT_KEYS`, `isSelfServiceProductKey`). Keep the two key lists in sync with the OpenAPI `ProductKey` enum.
- **DB schema (source of truth):** `lib/db/src/schema/{users,marketing,portal,cadence,learning,providers}.ts` (re-exported from `lib/db/src/index.ts`). `users.product_key` binds a user to a product. Plus the connect-pg-simple `session` table.
- **API contract (source of truth):** the OpenAPI spec in `@workspace/api-spec`. Generated client/hooks/schemas land in `lib/api-client-react/src/generated/`; the fetch wrapper is `lib/api-client-react/src/custom-fetch.ts`.
- **API routes:** `artifacts/api-server/src/routes/`. Auth (`auth.ts`) issues sessions and carries `productKey` on register/login/me. Per-product routers: `portal.ts` (Hub), `cadence.ts`, `rise.ts`, `meridian.ts`, plus the Compass engine routers (dashboard/clients/projects/courses/objectives/assessments/standards/qa/crosswalk). `index.ts` mounts everything and applies the Compass path-prefix gate. Auth helpers (`hash/verify`, `requireAuth`, `requireAdmin`, `requireProduct`) in `src/lib/auth.ts`. Email degrade-to-log in `src/lib/email.ts`. Startup seed in `src/lib/seed.ts`.
- **Web routing:** `artifacts/uva-engine/src/App.tsx` - public marketing routes, a `/portals` directory, legacy `/portal*` -> `/hub` redirects, and per-product routes generated from the registry: `/{key}`, `/{key}/login`, `/{key}/register` (each `/{key}` is a `wouter` `nest`). Auth context: `src/lib/auth-context.tsx`.
- **Per-product UI:** branded auth via `AuthShell` + `ProductLogin`/`ProductRegister`; the `ProtectedProduct` gate; `components/portal/ProductApp.tsx` maps a product key to its workspace component (Hub dashboard, `CadenceApp`, `RiseApp`, `MeridianApp`, Compass `EngineApp`/`Shell`). Product pages live under `src/pages/{portal,cadence,rise,meridian,...}/*`.
- **Public marketing pages:** `artifacts/uva-engine/src/pages/public/*` (including `Portals.tsx`, the product directory grouped by vertical). Per-route SEO: `src/lib/seo.ts`.
- **Brand tokens / theme:** `artifacts/uva-engine/src/index.css`; per-product accent comes from the registry.

## Architecture decisions

- **One web artifact, many surfaces.** The marketing site (root) and every product login/dashboard live in the same Vite app. Each product is mounted under a `wouter` `nest` at `/{key}` so its internal links need no rewriting.
- **One shared auth backend; one product per user.** A single session/auth system serves all products. `users.product_key` binds each user to one product; admins (`role = "admin"`) bypass product checks and see all.
- **Server is the security boundary.** Every product API route is authorized server-side with `requireProduct(key)` (admin bypass). The client-side `ProtectedProduct` gate is UX only. Compass engine routes are gated by a path-prefix `router.use([prefixes], requireProduct("compass"))`; Hub/Cadence/Rise/Meridian self-gate per-route or per-router. See `.agents/memory/product-route-gating.md`.
- **Self-service registration is opt-in per product.** `POST /auth/register` only accepts product keys in `SELF_SERVICE_PRODUCT_KEYS` (currently Hub); all other products are admin-provisioned. The server never trusts an arbitrary client-supplied `productKey`. See `.agents/memory/self-service-registration.md`.
- **No required API keys.** Engines are rules-based; optional LLM features must degrade gracefully behind an env fallback.
- **Contract-first.** Routes validate input/output with Zod; the web app consumes generated React Query hooks. Regenerate after spec changes.
- **Email never blocks a form.** Submissions persist to the DB first; notification email is best-effort and logs when no transport is configured.

## Dev credentials (seeded)

Three idempotent seed functions run on server start (`src/lib/seed.ts`, wired in
`src/index.ts`): `ensurePortalSeed` (portal resources, always runs),
`ensureDemoUsers`, and `ensureMeridianSeed` (synthetic providers/reviews/disputes).
The latter two are **skipped when `NODE_ENV=production`**, so demo users and
Meridian synthetic data exist in dev only. Demo users:

- Admin: `admin@demo.synops.test` (role `admin`).
- Per product: `{key}@demo.synops.test` (e.g. `cadence@demo.synops.test`, `meridian@demo.synops.test`).
- Password for all demo users: `Demo!2345`.

## Product

- Public marketing site: Home, About, Healthcare, Learning, Platforms, Government, Insights (+ article), Contact, and a `/portals` product directory.
- A public, rules-based **Adaptive Reading & Reasoning** demo (seeded item bank, no login) on the Platforms page: one unified adaptive assessment spanning all four reading skills (main idea, inference, vocabulary in context, evaluate argument), with a live learner-model panel and a per-skill result profile. No level picker.
- Per-product branded logins and dashboards as listed under **Products**.

## User preferences

- No emojis in UI copy or content.
- No em dashes in UI copy or content.
- Accessibility target: WCAG 2.1 AA.

## Gotchas

- **wouter nesting:** inside a product nest (`/{key}`, including ProtectedProduct, dashboards, the Compass Shell), links/redirects must be **absolute** (`~/...`) or relative to the nest. A plain `/{key}/...` from inside the nest resolves to `/{key}/{key}/...`. Top-level pages (the product Login/Register routes, PublicLayout) use plain paths.
- **Post-auth redirect is state-driven.** Login/Register redirect via `if (user) return <Redirect to=... />`, NOT an imperative `navigate()` in the submit handler. Imperative navigation races the auth-context re-render: it mounts the product before `user` propagates and bounces the visitor back to login.
- **Product authorization must cover EVERY route.** With the Compass path-prefix gate, a route under a NEW path prefix is wide open until that prefix is added to the gate list (a real gap was `DELETE /crosswalk-links/:id`). After adding any route to a prefix-gated product, confirm its prefix is in the list and re-curl the matrix.
- **Demo difficulty is 1-5** (not 0-1). The adaptive logic targets harder/easier items on that scale, and `masteryEstimate` is sent to the API as an **integer 0-100**.
- **Public demo runs a single adaptive track.** The bank is one unified pool; next-item selection adapts difficulty AND prefers untested skills so one run spans all four areas. The `level` field on `/demo/bank` and `/demo/sessions` is kept only to satisfy the API contract (fixed internally to `secondary`) and is never shown to users.
- **curl the API** through the shared proxy: `localhost:80/api/...` with `-H 'Origin: http://localhost'` and a cookie jar for session routes. Auth matrix to verify gating: product user -> own routes 200, -> other product 403, admin -> everything 200/404.

## Not yet implemented (stubs to be aware of)

- **Admin creation is manual.** There is no bootstrap endpoint; promote a user by setting `users.role = 'admin'` directly in the DB (the seeded admin exists in dev only). Non-self-service products are likewise provisioned by setting `users.product_key`.
- **Password reset** is not built (the login form shows a "coming soon" note).
- **Resource file uploads** are not built; `portal_resources.url` may be a placeholder (`#`).
- **PHI:** Hub portal messages are plain text with a notice asking clients not to submit PHI; there is no PHI-grade encryption/handling.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Durable lessons: `.agents/memory/product-route-gating.md`, `.agents/memory/self-service-registration.md`.
