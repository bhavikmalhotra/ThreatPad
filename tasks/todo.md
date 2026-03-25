# Fix server Docker crash — ESM directory imports

## Problem
Server container crash-loops with `ERR_UNSUPPORTED_DIR_IMPORT`. `packages/db` and `packages/shared`
ship raw `.ts` files to prod (not compiled). Node 22 ESM can load `.ts` natively but requires
explicit file extensions — extensionless/directory imports like `./schema` or `./users` fail.
These work in dev because `tsx` handles resolution, but prod uses raw `node`.

## Tasks
- [x] Fix Dockerfile CMD to use `tsx` loader: `node --import tsx apps/server/dist/index.js`
- [x] Move `tsx` from devDependencies to dependencies in server package.json (so it's available in prod)
- [x] Type-check passes (no source code changes needed)

## Review

### Changes Made (2 files, 2 lines)

1. **`apps/server/Dockerfile`** — Changed CMD from `node apps/server/dist/index.js` to
   `node --import tsx apps/server/dist/index.js`. The `--import tsx` flag registers tsx as an
   ESM loader, which transparently handles `.ts` files, extensionless imports, and directory imports.

2. **`apps/server/package.json`** — Moved `tsx` from `devDependencies` to `dependencies` so it's
   installed in the production Docker image.

### Why this approach
Tried adding `.ts` extensions to all imports first, but `allowImportingTsExtensions` conflicts
with the server's `noEmit: false` (it needs to compile to JS). The tsx loader approach is 2 lines,
zero source code changes, and handles the root cause: raw `.ts` packages running in Node ESM.
