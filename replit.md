# Synops Advisory Group

A public dual-practice consulting firm marketing site served at `/`, with an
institution-agnostic curriculum engine hidden behind a client-portal login. One
web app (the `uva-engine` artifact) hosts both surfaces; an Express API server
(`api-server`) backs them.

## Run & Operate

- `pnpm --filter @workspace/uva-engine run dev` - run the web app (Vite).
- `pnpm --filter @workspace/api-server run dev` - run the API server.
- `pnpm --filter @workspace/uva-engine run typecheck` - typecheck the web app (prefer this over `build` to verify; `build` needs workflow-provided `PORT`/`BASE_PATH`).
- `pnpm run typecheck` - full typecheck across all packages.
- `pnpm --filter @workspace/api-spec run codegen` - regenerate API hooks + Zod schemas from the OpenAPI spec. Do NOT change the OpenAPI `info.title` (it controls generated filenames).
- `pnpm --filter @workspace/db run push` - push DB schema changes (dev only).

These normally run as Replit workflows; do not run `pnpm dev` at the repo root.

### Required env

- `DATABASE_URL` - Postgres connection string.
- `SESSION_SECRET` - express-session signing secret.

### Optional env

- `CONTACT_EMAIL` - recipient for contact-form and demo-request notifications.
- `SMTP_URL` / `RESEND_API_KEY` / `SENDGRID_API_KEY` - outbound email transport. If none is set, email **degrades to logging** the message instead of sending (forms still succeed and persist to the DB).
- `REPLIT_DOMAINS` - comma-separated allowed origins for the CSRF origin check in production.
- `LOG_LEVEL` - pino log level (default `info`).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite, `wouter` v3 (routing), TanStack Query, Tailwind + shadcn/ui, `react-hook-form` + Zod, Recharts
- API: Express 5, `express-session` + `connect-pg-simple`, `bcryptjs`, `express-rate-limit`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `@workspace/api-client-react`
- Build: esbuild (API CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/{users,marketing,portal}.ts` (re-exported from `lib/db/src/index.ts`). Tables: `users`, `contact_submissions`, `newsletter_signups`, `demo_sessions`, `engagements`, `portal_resources`, plus the connect-pg-simple `session` table.
- API contract (source of truth): the OpenAPI spec in `@workspace/api-spec`. Generated client/hooks/schemas land in `lib/api-client-react/src/generated/`; the fetch wrapper is `lib/api-client-react/src/custom-fetch.ts`.
- API routes: `artifacts/api-server/src/routes/{auth,contact,newsletter,demo,portal,admin,index}.ts`. Auth helpers (`hash/verify`, `requireAuth`, `requireAdmin`) in `artifacts/api-server/src/lib/auth.ts`. Email degrade-to-log util in `src/lib/email.ts`. Startup seed in `src/lib/seed.ts`.
- Web routing: `artifacts/uva-engine/src/App.tsx`. Auth context: `src/lib/auth-context.tsx`. Per-route SEO: `src/lib/seo.ts` (`usePageMeta`). Insights content: `src/lib/insights-data.ts`.
- Public pages: `artifacts/uva-engine/src/pages/public/*`. Portal pages: `src/pages/portal/*`. Portal gate: `src/components/portal/ProtectedPortal.tsx`. Adaptive demo: `src/components/public/AdaptiveDemo.tsx`. Curriculum engine (extracted): `src/components/layout/EngineApp.tsx` + `Shell.tsx`.
- Brand tokens / theme: `artifacts/uva-engine/src/index.css`.

## Architecture decisions

- **One web artifact, two surfaces.** The marketing site (root) and the gated curriculum engine live in the same Vite app. The engine is mounted under a `wouter` `nest` at `/portal/engine` so its internal links need no rewriting.
- **Engine and portal are institution-agnostic.** Nothing Virginia/UVA-specific lives in the engine or portal. Virginia SWaM/eVA appears only on the public Government page as a home-state anchor.
- **Server is the security boundary.** Every gated API route is wrapped with `requireAuth`/`requireAdmin`; the client-side `ProtectedPortal` gate is UX only.
- **Contract-first.** Routes validate input/output with Zod; the web app consumes generated React Query hooks. Regenerate after spec changes.
- **Email never blocks a form.** Contact/demo/newsletter submissions persist to the DB first; notification email is best-effort and logs when no transport is configured.

## Product

- Public marketing site: Home, About, Healthcare, Learning, Platforms, Government, Insights (+ article), Contact.
- A public, rules-based **Adaptive Reading & Reasoning** demo (seeded item bank, no login) on the Platforms page: one unified adaptive assessment that spans all four reading skills (main idea, inference, vocabulary in context, evaluate argument), with a live learner-model panel and a per-skill result profile. No level picker.
- A client portal (gated): login, register, dashboard (engagements, shared resources, a message form, and a PHI security notice), and the curriculum engine.

## User preferences

- No emojis in UI copy or content.
- Accessibility target: WCAG 2.1 AA.

## Gotchas

- **wouter nesting:** inside the `/portal` nest (ProtectedPortal, PortalDashboard, the engine Shell), links/redirects must be **absolute** (`~/portal/...`) or relative to the nest (`/dashboard`). A plain `/portal/engine` resolves to `/portal/portal/engine`. Top-level pages (Login, Register, PublicLayout) use plain `/portal/...`.
- **Post-auth redirect is state-driven.** Login/Register redirect via `if (user) return <Redirect to="~/portal/dashboard" />`, NOT an imperative `navigate()` in the submit handler. Imperative navigation races the auth-context re-render: it mounts the portal before `user` propagates and bounces the visitor back to login.
- **Demo difficulty is 1–5** (not 0–1). The adaptive logic targets harder/easier items on that scale, and `masteryEstimate` is sent to the API as an **integer 0–100**.
- **Demo runs a single adaptive track.** The bank is one unified pool; next-item selection adapts difficulty AND prefers untested skills so one run spans all four areas. The `level` field on `/demo/bank` and `/demo/sessions` is kept only to satisfy the unchanged API contract (fixed internally to `secondary`) and is never shown to users.
- **curl the API** through the shared proxy: `localhost:80/api/...` with `-H 'Origin: http://localhost'` and a cookie jar for session routes.

## Not yet implemented (stubs to be aware of)

- **Admin creation is manual.** There is no bootstrap endpoint or script; promote a user by setting `users.role = 'admin'` directly in the DB.
- **Seeding covers portal resources only.** `ensurePortalSeed` runs idempotently on server start. The dev test client, its engagements, and any admin are NOT auto-seeded.
- **Password reset** is not built (the login form shows a "coming soon" note).
- **Resource file uploads** are not built; `portal_resources.url` may be a placeholder (`#`).
- **PHI:** portal messages are plain text. The dashboard shows a notice asking clients not to submit PHI; there is no PHI-grade encryption/handling.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
