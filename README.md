# ThreatPad

A collaborative, real-time note-taking platform built for Cyber Threat Intelligence (CTI) and security operations teams.

ThreatPad combines the speed of modern productivity tools with CTI-specific capabilities: IOC auto-extraction, STIX 2.1 export, structured threat templates, and fine-grained access control.

## Features

- **Rich Markdown Editor** — Tiptap-based WYSIWYG editor with Edit/Preview toggle, syntax-highlighted code blocks, tables, task lists
- **IOC Auto-Extraction** — Automatically detects IPs, domains, URLs, hashes, emails, and CVEs from note content
- **Plugin-Based Exports** — JSON, CSV, STIX 2.1 built-in. Add new formats with a single file (see [Writing Plugins](#writing-plugins))
- **CTI Templates** — Built-in templates for IOC Dump, Threat Actor Profile, Incident Notes, Campaign Tracker
- **Workspace & Folder Organization** — Nested folders (up to 5 levels), multiple workspaces, tag-based filtering
- **Access Control** — Workspace-level RBAC (owner/editor/viewer), per-note sharing, private notes
- **Version History** — Auto-snapshots every 5 minutes, manual snapshots, restore any version
- **Full-Text Search** — Postgres-backed search across all notes
- **Audit Logging** — Track all user actions across workspaces
- **Dark Mode** — Dark theme by default, designed for long analysis sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Tiptap 3 |
| Backend | Fastify 5, TypeScript, Drizzle ORM, Yjs (CRDT) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | bcrypt, JWT (jose), OAuth (Google, GitHub) |

## Quick Start

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Docker](https://docker.com/) (for Postgres & Redis)

### Local Development

```bash
# Clone the repository
git clone https://github.com/bhavikmalhotra/ThreatPad.git
cd ThreatPad

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start Postgres and Redis
docker compose up -d

# Push database schema
pnpm --filter @threatpad/db push

# Seed demo data (optional)
pnpm --filter @threatpad/db seed

# Start development servers
pnpm dev
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002
- **Health check:** http://localhost:3002/api/health

If you ran the seed script, log in with:
- **Email:** `demo@threatpad.io`
- **Password:** `password123`

### Docker Deployment (Production)

Deploy the entire stack with a single command:

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with production values (JWT secrets, domain URLs, etc.)

# Build and start all services
docker compose -f docker-compose.prod.yml up -d
```

That's it. The database schema is automatically applied on server startup. Open `http://localhost:3000` and you'll be guided through creating your admin account.

Optionally, seed demo data (templates, sample folders):

```bash
docker compose -f docker-compose.prod.yml exec server \
  node -e "import('child_process').then(c => c.execSync('npx tsx src/seed.ts', {cwd: '/app/packages/db', stdio: 'inherit'}))"
```

This starts:
- **PostgreSQL 16** on port 5432
- **Redis 7** on port 6379
- **ThreatPad API** on port 3002
- **ThreatPad Web** on port 3000

### Environment Variables

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

### Self-Hosted Setup

When deploying for your team, set `SELF_HOSTED=true` in your `.env`. On first visit, you'll be redirected to a setup page to create the admin account (no email verification required). After setup:

1. **Invite your team** via Workspace Settings → Members → Invite by email
2. **Lock down registration** by setting `DISABLE_REGISTRATION=true` — only invited users can join
3. **Health check** at `GET /api/health` returns DB and Redis connectivity status with latencies

### Backup & Restore

```bash
# Backup database (saves to ./backups/)
./scripts/backup.sh

# Backup to custom directory
./scripts/backup.sh /mnt/backups

# Restore from backup (interactive confirmation)
./scripts/restore.sh backups/threatpad_20260324_120000.sql.gz
```

Backups are gzipped SQL dumps. The script auto-detects Docker containers or uses `DATABASE_URL` directly. Old backups beyond 30 are auto-cleaned.

## Writing Plugins

ThreatPad uses a simple registry-based plugin system. Export is the first plugin type — more are planned (enrichment, import, IOC patterns).

### Export Plugin

Create a file in `apps/server/src/plugins/exporters/`:

```typescript
// apps/server/src/plugins/exporters/my-exporter.ts
import type { ExportPlugin } from '@threatpad/shared/types';

export const myExporter: ExportPlugin = {
  key: 'myformat',
  label: 'My Format',
  fileExtension: '.xml',
  contentType: 'application/xml',
  async export({ noteId, iocs, note }) {
    const xml = buildXml(iocs); // your logic here
    return { data: xml, contentType: 'application/xml', filename: `iocs-${noteId}.xml` };
  },
};
```

Then register it in `apps/server/src/plugins/exporters/index.ts`:

```typescript
import { myExporter } from './my-exporter.js';
exportRegistry.register(myExporter);
```

That's it. The frontend automatically picks up new formats from `GET /api/export-formats` — no UI changes needed.

### Planned Plugin Types

| Plugin Type | Use Case | Status |
|-------------|----------|--------|
| **Export** | IOC export formats (STIX, CSV, MISP, OpenIOC) | Available |
| **Enrichment** | IOC lookups (VirusTotal, Shodan, AbuseIPDB) | Planned |
| **IOC Patterns** | Custom indicator types (YARA, Bitcoin, MITRE ATT&CK) | Planned |
| **Import** | Ingest from feeds (TAXII, MISP, OpenCTI) | Planned |

## Project Structure

```
threatpad/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/app/         # App Router pages
│   │   ├── src/components/  # UI components (editor, layout, etc.)
│   │   ├── src/lib/         # API client, utilities
│   │   └── src/stores/      # Zustand state management
│   └── server/              # Fastify backend
│       ├── src/routes/      # REST API routes
│       ├── src/plugins/     # Auth, RBAC, audit plugins
│       └── src/ws/          # Yjs WebSocket server
├── packages/
│   ├── shared/              # Shared types, validators, IOC extractor
│   └── db/                  # Drizzle ORM schema and migrations
├── docker-compose.yml       # Local dev (Postgres + Redis)
└── docker-compose.prod.yml  # Production (full stack)
```

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login, returns JWT |
| `GET /api/workspaces` | List workspaces |
| `GET /api/workspaces/:id/notes` | List notes in workspace |
| `POST /api/workspaces/:id/notes` | Create note |
| `GET /api/workspaces/:id/notes/:noteId` | Get note |
| `PUT /api/workspaces/:id/notes/:noteId/content` | Update note content |
| `POST /api/notes/:noteId/extract-iocs` | Extract IOCs from note |
| `GET /api/notes/:noteId/iocs/export?format=stix` | Export IOCs (any registered format) |
| `GET /api/export-formats` | List available export plugins |
| `GET /api/workspaces/:id/search?q=query` | Full-text search |
| `GET /api/health` | Health check |

See the full API in `apps/server/src/routes/`.

## License

[MIT](LICENSE)
