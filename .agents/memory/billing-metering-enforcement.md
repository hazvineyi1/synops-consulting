---
name: Billing metering enforcement
description: Where and how the active-course quota must be enforced, and why the check+mutate must be atomic.
---

The metered quantity (active courses) is DERIVED, not stored: a course counts
only while its parent project's status is "active" (`countActiveCourses` joins
courses -> projects -> clients and filters `projects.status = 'active'`).

## Rule 1: guard EVERY transition that can raise the count, not just the obvious one
- Course create -> `createCourseWithLimit`.
- Project (re)activation (inactive -> active flips ALL that project's courses
  into the count) -> `activateProjectWithLimit`.

A future "un-archive", "clone project", "bulk activate", or import path will
re-open the bypass if it changes project status to active without going through
the activation guard.

**Why:** counting on a derived condition means any state change that flips the
condition is a metering event. The create-time meter alone misses courses piled
onto an inactive project that is later activated (the original P3 bypass).

## Rule 2: count-check and state change must be ONE atomic critical section
Both must run in a single `db.transaction` holding
`pg_advisory_xact_lock(BILLING_LOCK_NAMESPACE, orgId)`. Releasing the lock between
the check and the mutate lets two concurrent activations (or an activation racing
a create) both pass the check and overshoot the limit.

Use the SAME lock namespace + org key across all metered mutations so they
serialize against each other, and re-read current status inside the lock.

**How to apply:** new metered-write paths take the caller's mutation as a callback
run with the locked transaction executor (`apply(tx)`), mirroring
`createCourseWithLimit` / `activateProjectWithLimit`. Global actors bypass metering.
Guard with a concurrent regression test (fire both writes via `Promise.all`,
assert exactly one succeeds and the count never exceeds the limit).
