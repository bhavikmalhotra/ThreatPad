# Architecture

## Project Structure

```
threatpad/
├── apps/
│   ├── web/                 # Next.js 15 frontend
│   │   ├── src/app/         # App Router pages
│   │   ├── src/components/  # UI components (editor, layout, etc.)
│   │   ├── src/lib/         # API client, utilities
│   │   └── src/stores/      # Zustand state management
│   └── server/              # Fastify 5 backend
│       ├── src/routes/      # REST API routes
│       ├── src/plugins/     # Auth, RBAC, audit, exporters
│       └── src/ws/          # Yjs WebSocket server
├── packages/
│   ├── shared/              # Shared types, validators, IOC extractor
│   └── db/                  # Drizzle ORM schema and migrations
├── docker-compose.yml       # Local dev (Postgres + Redis)
└── docker-compose.prod.yml  # Production (full stack)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Tiptap 3 |
| Backend | Fastify 5, TypeScript, Drizzle ORM, Yjs (CRDT) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | bcrypt, JWT (jose), OAuth (Google, GitHub) |

## Monorepo

pnpm workspaces + Turborepo with four packages:

- **`packages/shared`** (`@threatpad/shared`) — Domain types, Zod validators, IOC regex patterns, utilities
- **`packages/db`** (`@threatpad/db`) — Drizzle ORM schema, migrations, seed script
- **`apps/web`** (`@threatpad/web`) — Next.js frontend (App Router, React 19)
- **`apps/server`** (`@threatpad/server`) — Fastify backend with REST API and Yjs WebSocket

## Database

Drizzle ORM with `postgres.js` driver. Key tables: `users`, `workspaces`, `workspace_members`, `folders`, `notes`, `note_versions`, `note_permissions`, `note_templates`, `tags`, `note_tags`, `note_iocs`, `audit_logs`, `refresh_tokens`.

## Plugin System

Registry-based plugin architecture. See [Writing Plugins](../README.md#writing-plugins) in the README.

Current plugin types:
- **Export plugins** (`apps/server/src/plugins/exporters/`) — JSON, CSV, STIX 2.1 built-in

Planned: Enrichment, IOC patterns, Import.
