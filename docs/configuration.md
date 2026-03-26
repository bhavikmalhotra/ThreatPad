# Configuration

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/threatpad` | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | Yes | `change-me-in-production` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | `change-me-in-production-refresh` | Refresh token secret |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `APP_URL` | No | `http://localhost:3000` | Frontend URL |
| `API_URL` | No | `http://localhost:3002` | Backend URL |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth client secret |
| `RESEND_API_KEY` | No | — | Resend email API key (falls back to console) |
| `FROM_EMAIL` | No | `noreply@threatpad.io` | Sender email address |
| `SELF_HOSTED` | No | `false` | Skips email verification for new users |
| `DISABLE_REGISTRATION` | No | `false` | Blocks public registration (invite-only) |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3002` | API URL for frontend |
| `NEXT_PUBLIC_WS_URL` | Yes | `ws://localhost:3002` | WebSocket URL for frontend |

## Self-Hosted Setup

When deploying for your team, set `SELF_HOSTED=true` in your `.env`. On first visit, you'll be redirected to a setup page to create the admin account (no email verification required). After setup:

1. **Invite your team** via Workspace Settings > Members > Invite by email
2. **Lock down registration** by setting `DISABLE_REGISTRATION=true` — only invited users can join
3. **Health check** at `GET /api/health` returns DB and Redis connectivity status with latencies

## Backup & Restore

```bash
# Backup database (saves to ./backups/)
./scripts/backup.sh

# Backup to custom directory
./scripts/backup.sh /mnt/backups

# Restore from backup (interactive confirmation)
./scripts/restore.sh backups/threatpad_20260324_120000.sql.gz
```

Backups are gzipped SQL dumps. The script auto-detects Docker containers or uses `DATABASE_URL` directly. Old backups beyond 30 are auto-cleaned.
