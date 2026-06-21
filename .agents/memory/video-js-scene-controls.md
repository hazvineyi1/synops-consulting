---
name: video-js custom scene controls
description: Video-js artifacts here may layer a custom scene-control wrapper on the scaffold that DESIGN-subagent iterations can silently strip.
---

Some video-js artifacts in this repo (e.g. `curriculum-builder-demo`) add a custom
scene-control layer on top of the standard scaffold:

- `VideoTemplate.tsx` is NOT the bare scaffold form. It exports `SCENE_DURATIONS`
  and accepts `{ durations, loop, onSceneChange }` props, and strips a `_r[12]$`
  repeat suffix off the scene key before picking the scene component.
- `VideoWithControls.tsx` + `useSceneControls.ts` render the on-iframe control bar
  (loop-current-scene, jump-to-scene, progress) and feed rotated/locked durations
  back into `VideoTemplate`. `App.tsx` renders `VideoWithControls`, not
  `VideoTemplate`.

**Why this bites:** the video-js skill requires re-delegating every iteration to the
DESIGN subagent, and tells you NOT to mention scene selectors to it. The subagent
follows the standard skill, which rewrites `VideoTemplate.tsx` into the bare form
(default export, plain `useVideoPlayer`, no prop API, no `SCENE_DURATIONS` export).
That silently breaks `VideoWithControls`' import and the controls.

**How to apply:** after any DESIGN-subagent video iteration, re-read
`VideoTemplate.tsx` and re-apply the prop API + `SCENE_DURATIONS` export + repeat-suffix
stripping if they were dropped; confirm `App.tsx` still renders `VideoWithControls`.
Verify with `bash scripts/validate-recording.sh` and check the preview's control bar
still works.

**Unrelated benign gotcha in these artifacts:** `pnpm --filter <slug> run typecheck`
reports pre-existing DOM-lib errors (`Cannot find name 'window'/'document'/'Node'`)
in `src/lib/video/*`, `src/main.tsx`, `src/hooks/use-mobile.tsx`, and
`VideoWithControls.tsx`, plus framer-motion `Variant` type errors in
`src/lib/video/animations.ts`. These are a scaffold tsconfig quirk, not runtime bugs;
Vite builds and runs fine. Don't chase them as part of a video change.
