# Domain Filtering via Env Variable

## Plan
Add `ALLOWED_EMAIL_DOMAINS` env var that restricts registration and OAuth login to specific email domains.

## Tasks
- [x] Add `ALLOWED_EMAIL_DOMAINS` to env schema in `apps/server/src/config/env.ts`
- [x] Add domain validation helper + enforce in `/register`
- [x] Enforce domain check in Google OAuth callback
- [x] Enforce domain check in GitHub OAuth callback
- [x] Expose allowed domains in `/api/auth/config` for frontend awareness
- [x] Add to `.env.example` and `docker-compose.prod.yml`
- [x] Add `oauth_domain_not_allowed` error message to login page
- [x] Type-check passes

## Notes
- `/setup` (first admin) is NOT restricted — otherwise you can't bootstrap
- Empty value = allow all domains (no restriction)
- Comma-separated for multiple domains: `partner.org`
- Domain check is case-insensitive

## Review

All tasks completed. Server type-checks clean.

### Changes Made

1. **`apps/server/src/config/env.ts`** — Added `ALLOWED_EMAIL_DOMAINS` string env var (default empty = no restriction).

2. **`apps/server/src/routes/auth.ts`** — 4 changes:
   - Added `isEmailDomainAllowed(email)` helper — parses comma-separated domains, case-insensitive match, returns true if env var is empty.
   - `/register` — rejects signup with 403 if domain not in allow list.
   - Google OAuth callback — redirects to `/login?error=oauth_domain_not_allowed` if domain blocked.
   - GitHub OAuth callback — same redirect.
   - `/api/auth/config` — now returns `allowedEmailDomains: string[]` so frontend can inform users.

3. **`apps/web/src/app/(auth)/login/page.tsx`** — Added `oauth_domain_not_allowed` error message: "Your email domain is not allowed. Contact your administrator."

4. **`.env.example`** — Documented `ALLOWED_EMAIL_DOMAINS` with usage example.

5. **`docker-compose.prod.yml`** — Passes `ALLOWED_EMAIL_DOMAINS` env var to server container.
