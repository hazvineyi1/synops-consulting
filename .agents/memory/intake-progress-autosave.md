---
name: intake_progress patch-safe upsert
description: Why the intake-progress PUT must only set columns present in the request, since one row holds several independently-autosaved JSON columns.
---

# intake_progress is one row of independently-autosaved columns

The `intake_progress` table holds several independently-edited JSON columns for a
single project in ONE row: the SEGMENTS-indexed checklist state (`agendaChecks`,
`segStatuses`, `confirmedPre`, `notes`, `inventorySelections`, `autoRules`) plus
`kickoffAnswers` (the rules-based Socratic kickoff state) and `generatedAgenda`.

**Rule:** `PUT /compass/projects/:id/intake-progress` must be PATCH-safe. On
conflict, only set the columns actually present in the request body; never write a
default for an omitted column.

**Why:** every field in the request body is optional, and different UI surfaces
autosave different subsets of this shared row independently (the Meet-tab agenda
checklist vs. the kickoff interview vs. the Start tab). An earlier version built
every column from `body.X ?? EMPTY` on both insert and conflict-update, so a
partial autosave (e.g. kickoff-only) would reset every sibling column to empty.
A full-snapshot client happened to mask this, but the API contract must guarantee
no clobber regardless of caller.

**How to apply:** when adding ANY new autosave column to intake_progress,
(1) add it to the EMPTY defaults used for the insert path, and (2) add a
`if (body.col !== undefined) set.col = ...` line to the conflict-update set. Keep
`updatedAt: new Date()` always in the set so it is never empty. Verify with two
partial PUTs that each touch only one column and confirm the other survives.
