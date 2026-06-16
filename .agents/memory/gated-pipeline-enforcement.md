---
name: Gated pipeline enforcement
description: The 6-stage project pipeline gate must be enforced on the server, not only in the UI.
---

# Gated pipeline enforcement

The project pipeline has stage-0..5 gates. Each stage has blocking requirements
(e.g. stage 0 needs a course + at least one unflagged course objective). Whether a
project can move to the next stage is computed in one place and shared by both the
read endpoint and the mutation.

**Rule:** Any endpoint that advances a project's stage MUST recompute the gate and
reject (HTTP 409 with the unmet requirements) when blocking requirements are unmet.
Never rely on the client disabling the advance button — that is bypassable. The
read endpoint (gate-status) and the advance mutation must use the *same* gate
computation so they can never disagree.

**Why:** A prior version only disabled the client button while the advance route
blindly incremented the stage, so any direct API call bypassed the entire gated
workflow — a workflow-integrity/access-control hole.

**How to apply:** When adding a new gated transition or a new stage requirement,
extend the single shared gate helper and call it from both the status read and the
advancing mutation. Surface the returned `requirements`/`unmet` to the client so it
can refresh its readiness panel on a 409.
