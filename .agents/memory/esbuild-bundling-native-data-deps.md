---
name: esbuild bundling of libs with data files / runtime requires
description: Why some npm libs crash at RUNTIME (not build) when api-server is esbuild-bundled to CJS, and how to fix it.
---

The api-server is bundled to a single CJS file by esbuild (`build.mjs`). Two
classes of dependency survive a clean typecheck/build but crash only at runtime:

1. **Libs that read sibling data files via `__dirname`.** esbuild rewrites
   `__dirname` to point at `dist/`, so the lib looks for its data next to the
   bundle instead of in `node_modules` and throws ENOENT. Example: `pdfkit`
   loads `.afm` font-metric files (e.g. `data/Helvetica.afm`) at render time.

2. **Libs whose code does a runtime `require()` of a helper that esbuild
   externalizes.** Example: `fontkit` (pulled in by pdfkit) -> brotli ->
   `@swc/helpers`. If `@swc/helpers` is not an installed dependency, the require
   is unresolvable at runtime.

**Fix:**
- Add the data-carrying lib (e.g. `pdfkit`) to the esbuild `external` array so it
  loads from `node_modules` with its data dir intact, and keep it a direct
  dependency.
- Add any transitively-required helper package (e.g. `@swc/helpers`) as a DIRECT
  dependency so it is actually installed.

**Why:** a green build/typecheck does not prove a bundled server boots; these are
runtime-only failures. **How to apply:** when adding a binary/asset-heavy lib to
an esbuild-bundled server, smoke-test the real endpoint (curl) after restart, and
if it ENOENTs on a data file or fails to resolve a helper, externalize the lib
and/or add the missing helper as a direct dep.
