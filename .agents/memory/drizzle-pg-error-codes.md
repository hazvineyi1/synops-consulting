---
name: Drizzle pg error codes (cause unwrap)
description: Why mapping a Postgres unique violation (or any SQLSTATE) to an HTTP status needs to walk err.cause, not just err.
---

Drizzle (node-postgres driver) wraps the raw pg driver error before throwing.
The Postgres SQLSTATE (e.g. `23505` unique_violation) is therefore NOT on the
top-level thrown error in general; it sits on `err.cause` (and could be nested).

**Rule:** to translate a DB constraint error into an HTTP status, walk both
`err` and `err.cause` (a few levels) checking `code`. Do not rely on
`(err as any).code` alone.

**Why:** a catch that only read `err.code` silently fell through to `throw err`,
so a racing duplicate insert returned a 500 HTML error page instead of the
intended 409. Verified by firing two concurrent requests.

**How to apply:** any handler that catches a DB write to map a constraint
(unique, FK, check) to a 4xx must unwrap the cause chain. Pair a partial unique
index (the real guarantee) with this catch as the friendly response; a
pre-check SELECT alone is not race-safe.

Related pattern: enforce "at most one running X per (a,b)" with a partial unique
index `... WHERE ended_at IS NULL`, and make the stop/close atomic with
`UPDATE ... WHERE id = ? AND ended_at IS NULL RETURNING` (no row back => already
closed => 400), rather than read-then-write.

For date-only fields stored as a timestamp, anchor the wire value at 12:00 UTC
on write and render/read it back in UTC (not local) so the user's chosen
calendar day is exact even at UTC+12..+14; instants captured live (timers) stay
local.
