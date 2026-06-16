---
name: Per-product API route gating
description: How to scope requireProduct(key) so it gates one product's routes without blocking others
---

# Per-product API route gating (Express)

Each product API must be authorized server-side so a user bound to product A
cannot call product B's endpoints (admins bypass). The helper is
`requireProduct(key)` in `artifacts/api-server/src/lib/auth.ts`.

## Rule
Apply `requireProduct(key)` either **per-route** (as cadence/rise do:
`router.get("/cadence/...", gate, handler)`) or via **path-prefix-scoped**
middleware (`router.use([prefixes], requireProduct(key))`). Never mount it on a
pathless sub-router.

**Why:** A pathless `router.use(requireProduct("compass"))` (or
`subRouter.use(requireProduct(...))` mounted with `router.use(subRouter)`) runs
as middleware **before** route matching. On a failed product check it sends 403
and never calls `next()`, so it blocks EVERY later route in the parent router —
including other products' routes (hub `/portal/*`, cadence, rise) and admin.
Symptom seen: a Hub user got 403 "You do not have access to this product." on
`/portal/engagements` after compass gating was added pathlessly.

**How to apply:** Express `router.use(path, mw)` does prefix matching, so listing
the engine's base path prefixes gates exactly those routes and nothing else. The
Compass engine prefixes must cover ALL its routes — including destructive ones.
A real gap: `DELETE /crosswalk-links/:id` was reachable cross-product because
`/crosswalk-links` was missing from the prefix list even though create/list were
covered. When using a prefix-list gate, every verb under every engine prefix is
covered, but a route under a NEW prefix is wide open until you add it. After
adding any route to a prefix-gated product, confirm its prefix is in the list.
Routes for other products live under their own prefixes (`/portal`, `/cadence`,
`/rise`, `/meridian`) and self-gate per-route/per-router, so they are untouched.

## Verify after any gating change
Restart the api-server workflow (route changes are not always hot), then curl the
matrix: product user -> own routes 200, product user -> other product 403, admin
-> everything 200. curl via the proxy: `localhost:80/api/...` with
`-H Origin:http://localhost` and a cookie jar from `/api/auth/login`.
