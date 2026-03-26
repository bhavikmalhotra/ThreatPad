# Docker Production Setup - Fix & Verify

## Issues Found & Fixed

### 1. Web Dockerfile — build failed (Cannot find module 'next')
**Root cause:** `.dockerignore` had `node_modules` which only matches root-level. Nested `apps/web/node_modules/` with Windows symlinks was copied into the container, overwriting the Linux-native pnpm install.
**Fix:** Changed `.dockerignore` to use `**/node_modules`, `**/.next`, `**/dist` glob patterns.

### 2. Web Dockerfile — unnecessary multi-stage complexity
**Root cause:** Separate deps/builder stages broke pnpm symlinks during `COPY --from`.
**Fix:** Merged into single builder stage (install + build in same stage, then copy standalone output to runner).

### 3. Server — crash loop on startup (ENOENT for /bin/sh, pnpm, npx)
**Root cause:** `execSync`/`execFileSync` in `index.ts` couldn't find shell or pnpm binaries at container runtime. PATH wasn't properly set for child processes spawned from tsx.
**Fix:** Moved migration logic from Node.js `index.ts` into a shell entrypoint script (`entrypoint.sh`) that runs `drizzle-kit push` before starting the app. This is the standard Docker pattern.

## Tasks

- [x] 1. Fix `.dockerignore` — use `**` glob patterns for nested directories
- [x] 2. Simplify web Dockerfile — merge deps+builder stages
- [x] 3. Fix server migration — entrypoint script instead of execSync
- [x] 4. Verify all 4 services running and healthy

## Verification Results

All services running via `docker compose -f docker-compose.prod.yml up -d`:
- **postgres** — healthy
- **redis** — healthy
- **server (3002)** — DB connected (17ms), Redis connected (9ms), schema push successful
- **web (3000)** — responding (307 redirect to login)

## Files Changed

1. `.dockerignore` — `node_modules` → `**/node_modules`, `.next` → `**/.next`, `dist` → `**/dist`
2. `apps/web/Dockerfile` — merged deps+builder into single builder stage
3. `apps/server/Dockerfile` — added entrypoint.sh copy + ENTRYPOINT
4. `apps/server/entrypoint.sh` — new file, runs drizzle-kit push then starts tsx
5. `apps/server/src/index.ts` — removed execSync migration code (now in entrypoint.sh)
