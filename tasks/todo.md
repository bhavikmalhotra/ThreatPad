# Fix /setup redirect on fresh install

## Problem
When a fresh prod Docker instance starts, visiting `/` does not redirect to `/setup`.
Root cause: `page.tsx` always redirected to `/login`, and the login page silently swallowed
config API failures (defaulting to `setupRequired: false`).

## Tasks
- [x] Fix root page: check config server-side and redirect to `/setup` or `/login` accordingly
- [x] Fix login page: retry config fetch on failure instead of silently defaulting
- [x] Fix login page: show error state if config is unreachable after retries
- [x] Type-check passes

## Review

### Changes Made

1. **`apps/web/src/app/page.tsx`** — Made it an async server component. Fetches `/api/auth/config` server-side with `cache: 'no-store'`. If `setupRequired: true`, redirects to `/setup`. Falls through to `/login` on failure or when setup is done.

2. **`apps/web/src/app/(auth)/login/page.tsx`** — Two fixes:
   - Config fetch now retries up to 3 times with 2-second delays (handles server still starting).
   - After 3 failures, shows a warning message instead of silently hiding the problem.
   - Added `allowedEmailDomains` to the `AuthConfig` interface.
