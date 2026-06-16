---
name: Demo seed idempotency
description: Why per-product demo data seeding must be decoupled from user-account creation in the startup seed.
---

The startup demo seed creates demo users only when missing (idempotent by email).
Originally, per-product sample data (e.g. Cadence engagements) was seeded inline
*only when the user was newly created*.

**Problem:** if you add a new product's seed data after the demo users already
exist in the dev DB, the inline branch never runs — the user exists, so it is
skipped — and that product's demo account logs in to an empty workspace.

**Rule:** seed per-product demo data in its own idempotent step that checks for
the data's existence (e.g. "does this demo user have any engagements?"), not as a
side effect of inserting the user. Run that step on every startup regardless of
whether any users were created.

**Why:** dev DBs are long-lived and accumulate accounts across sessions; tying
data seeding to account creation makes new seed code silently no-op on them.

**How to apply:** when adding a new build-now product with demo data, add an
`ensure<Product>DemoData()` that early-returns when the data already exists, and
call it unconditionally after the user-creation loop.
