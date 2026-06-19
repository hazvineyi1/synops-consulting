---
name: Optimistic full-row toggles serialize per row
description: Client rule for optimistic checkbox toggles when a PATCH returns the whole row and several independent sub-fields can be toggled concurrently.
---

When a PATCH endpoint returns the FULL updated row and the UI optimistically toggles
several independent sub-fields of that row (e.g. a meeting's pre-work, standing agenda,
and exit-criteria checklists, plus a separate generated-agenda blob), serialize every
write for that row through ONE promise chain keyed by the row id, NOT one chain per
field/section/blob. On each server response, shift the transform it confirms and replay
ALL still-pending transforms over the returned row before writing it to the cache.

**Why:** Each response carries the entire row. With per-section chains, two concurrent
toggles in different sections each track only their own pending queue; a delayed response
for section A overwrites the cache with a row that lacks section B's in-flight change, so
B visibly reverts until its own response lands. One chain per row also guarantees at most
one PATCH in flight per row, so the server's read-modify-write of its JSON columns never
races itself. An architect review caught this after an initial per-section implementation.

**How to apply:** Any optimistic-toggle UI sitting over a coarse-grained row PATCH. Keep
each toggle transform pure `(row) => row` so it can be replayed in order on top of any
server response. See `applyPlanToggle` / `applyAgendaToggle` and `runMeetingToggle` in
`artifacts/uva-engine/src/pages/ProjectMeetings.tsx` for the reference shape.
