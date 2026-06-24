---
name: Demo usage-counting "log once" guard
description: A useRef "fire once" guard for anonymous usage/analytics must be reset on every fresh-start path, or repeat runs go uncounted.
---

# "Log once per run" guards must reset on every restart path

When counting anonymous usage by firing a one-shot side effect (e.g. logging a
demo session the first time a visitor reaches a terminal stage), the natural
implementation is a `useRef(false)` guard flipped to `true` on first fire so the
same render-driven transition does not double-count.

**The trap:** that guard persists for the lifetime of the mounted component. Every
path that begins a *new* run while the component stays mounted (a "Start over"
button, "Load example", "Clear/Start fresh") must reset the guard back to `false`,
or the second and later runs in the same page session are silently never counted.

**Why:** the bug is invisible. The first run logs correctly, typecheck passes, and
a single manual test looks fine; only a second run in the same session reveals the
missed count. It surfaced in review, not in normal testing.

**How to apply:** when you add a `loggedRef`/`firedRef`-style guard for run or
session counting, enumerate every UI action that conceptually starts a new run and
reset the guard in each. Do not reset it inside generic back/next navigation, or
ordinary back-and-forth within one run will inflate the count. Reset only on true
restart / fresh-input actions.
