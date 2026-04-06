# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThreatPad is a collaborative, real-time note-taking app for cybersecurity / CTI teams. It features a Tiptap-based Markdown editor with Yjs collaboration, IOC auto-extraction, STIX 2.1 export, structured CTI templates, RBAC, and audit logging.

## Monorepo Structure

pnpm workspaces + Turborepo monorepo with four workspace packages:

- **`packages/shared`** (`@threatpad/shared`) — Domain types, Zod validators, constants (IOC regex patterns, system templates, role definitions), and utilities (IOC extraction, defang/refang)
- **`packages/db`** (`@threatpad/db`) — Drizzle ORM schema definitions, migrations, and seed script for PostgreSQL
- **`apps/web`** (`@threatpad/web`) — Next.js 15 frontend (App Router, React 19, TypeScript)
- **`apps/server`** (`@threatpad/server`) — Fastify 5 backend with REST API and Yjs WebSocket server

The shared package is consumed via `workspace:*` protocol and must be transpiled by Next.js (`transpilePackages` in next.config.ts).

## Commands

```bash
# Install dependencies
pnpm install

# Development (all workspaces)
pnpm dev

# Development (frontend only)
pnpm --filter @threatpad/web dev    # http://localhost:3000

# Development (backend only)
pnpm --filter @threatpad/server dev # http://localhost:3002

# Start local Postgres + Redis
docker compose up -d

# Database operations
pnpm --filter @threatpad/db push    # Push schema to DB
pnpm --filter @threatpad/db seed    # Seed demo data
pnpm --filter @threatpad/db studio  # Drizzle Studio GUI

# Production build
pnpm build

# Production Docker (all services)
docker compose -f docker-compose.prod.yml up -d

# Lint / type-check
pnpm lint
```

There are no tests yet.

## Architecture

### Frontend (`apps/web`)

**Routing:** Next.js App Router with two route groups:
- `(auth)` — public pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- `(app)` — authenticated layout with sidebar + header: `/dashboard`, `/workspace/[workspaceId]/**`
- `/oauth/callback` — handles OAuth redirect with accessToken param

**State management:**
- `Zustand` stores in `src/stores/` — `auth-store` (user session, JWT token) and `ui-store` (sidebar state, active workspace, command palette)
- All pages are wired to the real backend API via `src/lib/api-client.ts`

**Editor:** Tiptap 3 (ProseMirror-based) in `src/components/editor/`. Key config:
- `immediatelyRender: false` is required to avoid SSR hydration errors
- Extensions: StarterKit, CodeBlockLowlight (syntax highlighting via lowlight), Tables, TaskList, Highlight, Link, Image, Placeholder, ExcalidrawBlock
- Edit/Preview toggle — Edit mode shows WYSIWYG editor with toolbar; Preview mode renders content as clean read-only HTML with Tailwind Typography (`prose prose-invert`)
- Content is stored as HTML in the `contentMd` field (not raw markdown)
- Debounced auto-save (1 second) on both content and title changes
- Image upload: paste, drag-drop, or toolbar button → uploads to server via `POST /api/workspaces/:id/uploads`, stores on disk, references by authenticated URL
- Collaboration-ready (Yjs + y-websocket installed but not yet connected)

**Drawing support:** Two modes of drawing via `@excalidraw/excalidraw`:
- **Full-page drawings** — Notes with `type: 'drawing'` open a full-screen Excalidraw canvas instead of the text editor. Created via "New Drawing" in sidebar, folder context menu, or command palette. Drawing data stored as JSON in `contentMd`.
- **Embedded drawing blocks** — Text notes can contain inline drawing blocks via the `ExcalidrawBlock` Tiptap extension. Insert via toolbar "Insert Drawing" button. Shows a preview card in the editor; click "Edit" opens a full-screen Excalidraw modal. Drawing data stored as a JSON attribute on the node, serialized as `<div data-type="excalidraw" data-content="...">`.
- Excalidraw MUST be dynamically imported with `next/dynamic` + `ssr: false` (uses browser APIs)
- Dark theme (`theme="dark"`) to match ThreatPad
- Drawing editor debounces saves at 2 seconds (vs 1 second for text)
- `pnpm.overrides` in root `package.json` pins `@tiptap/core@3.20.4` to prevent version conflicts

**UI components:** Radix UI primitives wrapped with Tailwind in `src/components/ui/` (shadcn/ui pattern). Use `cn()` from `src/lib/utils.ts` for class merging.

**Styling:** Tailwind CSS 4 with `@tailwindcss/typography` plugin and custom theme variables in `src/styles/globals.css`. Dark mode is the default (class `dark` on `<html>`). Primary color: `#6366f1` (indigo).

**API client:** `src/lib/api-client.ts` — typed fetch wrapper (get, post, patch, put, delete, upload) with automatic JWT refresh on 401. Reads token from Zustand auth store. Base URL from `NEXT_PUBLIC_API_URL`. Important: Content-Type header is only set when request has a body (DELETE requests with no body must not set it). The `upload()` method uses FormData for multipart file uploads (does not set Content-Type — browser handles the boundary).

**Cross-component communication:** Child pages dispatch `CustomEvent` on `window` to notify the layout to refresh data:
- `threatpad:refresh-folders` — refreshes sidebar folder tree (e.g., after title change)
- `threatpad:refresh-tags` — refreshes sidebar tag list (e.g., after tag deletion)

**Key pages:**
- `/dashboard` — recent notes, pinned notes, stats. "ThreatPad" in header links here.
- `/workspace/[id]` — note list with search, grid/list view toggle
- `/workspace/[id]/note/[noteId]` — full note editor with: title editing, tag picker (with inline create), visibility toggle (private/workspace), pin, share dialog, IOC extraction panel, version history panel, export (Markdown, STIX 2.1), duplicate, delete
- `/workspace/[id]/settings` — workspace general settings with tabbed navigation to Members and Audit Log
- `/workspace/[id]/settings/members` — invite by email, role management, member removal
- `/workspace/[id]/settings/audit-log` — paginated audit log with action type badges
- `/workspace/[id]/search` — debounced full-text search
- `/settings/profile` — display name update, password change

**Sidebar features:**
- Workspace switcher with create workspace
- Folder tree showing subfolders and notes inside each folder
- Tag list with filter toggle and delete (X button on hover)
- "Workspace Settings" link at bottom
- "New" dropdown: New Note, New Drawing, New Folder, From Template

### Shared Package (`packages/shared`)

Exports via subpath: `@threatpad/shared/types`, `@threatpad/shared/constants`, `@threatpad/shared/validators`, `@threatpad/shared/utils`.

Key exports:
- **IOC patterns** (`constants/ioc-patterns.ts`) — regex patterns for IPv4, IPv6, domains, URLs, hashes, emails, CVEs with defang support
- **System templates** (`constants/templates.ts`) — Markdown templates for IOC Dump, Threat Actor Profile, Incident Notes, Campaign Tracker
- **Zod schemas** (`validators/`) — validation for login, register, workspace/folder/note/tag CRUD, search
- **IOC extractor** (`utils/ioc-extractor.ts`) — `extractIocs(text)` returns typed IOCs with context snippets and in-memory deduplication via `seen` set; `refang()`/`defang()` for indicator formatting
- **FolderTreeNode type** (`types/folder.ts`) — includes `children` (subfolders), `noteCount`, and `notes` (FolderNoteItem array with id, title, type, folderId, updatedAt)

### Backend (`apps/server`)

**Framework:** Fastify 5 with plugin architecture. Entry point: `src/index.ts` → `src/app.ts` (buildApp factory). Server runs on port **3002**.

**CORS:** Configured with explicit methods list: `GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS`. Origin from `CORS_ORIGIN` env var.

**Plugins** (`src/plugins/`):
- `auth.ts` — JWT verification (HS256 via jose), `verifyJwt` preHandler, `verifyToken` for WS auth, token generation utilities
- `rbac.ts` — `resolveWorkspaceRole` preHandler + `requireRole('editor')` factory
- `audit.ts` — `audit()` decorator for logging user actions
- `exporters/` — Plugin-based export system (see Plugin Architecture below)

**Routes** (`src/routes/`):
- `auth.ts` — register, login (bcrypt), refresh token rotation, logout, GET/PATCH /me, change-password, Google OAuth, GitHub OAuth, forgot/reset password, email verification, resend verification
- `workspaces.ts` — CRUD + member invite/role/remove
- `folders.ts` — CRUD with tree building (includes notes per folder), depth validation (max 5), note count via `count(*)`, soft delete
- `notes.ts` — CRUD, visibility filtering (private notes only visible to creator), template content, tag enrichment, content update with auto-versioning (snapshots every 5 min), duplicate, note-level sharing (permissions CRUD). Notes have a `type` field (`text` or `drawing`); word count is skipped for drawings.
- `tags.ts` — CRUD (editor role) + add/remove tags from notes (via `noteTags` junction)
- `templates.ts` — list (system + workspace), create, get, delete (protects system)
- `search.ts` — full-text search via Postgres `to_tsvector`/`to_tsquery`
- `iocs.ts` — IOC extraction (clears existing then re-inserts to prevent duplicates), list, plugin-based export via `exportRegistry`, delete
- `export-formats.ts` — `GET /api/export-formats` returns available export plugins (frontend auto-discovers)
- `uploads.ts` — authenticated image upload and serving (see Image Upload section below)
- `versions.ts` — list, get, diff (line-based), restore (creates new version), manual snapshot
- `audit-logs.ts` — paginated audit log viewer with filters

**Note sharing:** Notes have per-note permissions via `notePermissions` table. Routes at `/:workspaceId/notes/:noteId/permissions` — list, add (by email), remove. Roles: owner/editor/viewer.

**Auto-versioning:** Content saves (`PUT /:workspaceId/notes/:noteId/content`) automatically create version snapshots if >5 minutes since last version. Tracks lines added/removed.

**Services** (`src/services/`):
- `email.ts` — Resend API integration for transactional emails (verification, password reset). Falls back to console logging in dev when `RESEND_API_KEY` is not set.

**WebSocket** (`src/ws/`):
- `yjs-server.ts` — Yjs CRDT sync via `@fastify/websocket`, awareness protocol, room management, debounced persistence
- `persistence.ts` — load/persist Yjs document state to/from Postgres `yjs_state` bytea column

**Config:** `src/config/env.ts` — Zod-validated env vars: DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET, RESEND_API_KEY, FROM_EMAIL, APP_URL, API_URL, CORS_ORIGIN, UPLOAD_DIR. All have sensible dev defaults.

**Auth architecture:**
- Email/password: bcrypt (cost 12), JWT access tokens (15min, HS256 via jose), HTTP-only refresh token cookies (7 days) with rotation
- OAuth: Google + GitHub with CSRF state cookie, auto-links accounts by email
- Email verification required before login (sends via Resend, dev fallback to console)
- Password reset via time-limited tokens (1hr expiry)
- Login rate limiting: 5 attempts per 15 minutes per IP

### Database (`packages/db`)

**ORM:** Drizzle ORM with `postgres.js` driver. Schema in `src/schema/` (14 tables).

Key tables: `users`, `workspaces`, `workspace_members`, `folders`, `notes`, `note_versions`, `note_permissions`, `note_templates`, `tags`, `note_tags`, `note_iocs`, `uploads`, `audit_logs`, `refresh_tokens`, `verification_tokens`, `workspace_invitations`.

The `notes` table has a `type` column (`note_type` enum: `text` | `drawing`, default `text`). Drawing notes store Excalidraw JSON in `contentMd`.

Drizzle relations are defined in `src/schema/relations.ts` — enables `with: {}` eager loading in queries.

### Plugin Architecture

ThreatPad uses a simple registry-based plugin system. A plugin is an object implementing a typed interface, registered at startup. No dynamic loading or config files — just import and register.

**Export Plugins** (`apps/server/src/plugins/exporters/`):
- **Interface:** `ExportPlugin` (defined in `packages/shared/src/types/export-plugin.ts`) — `key`, `label`, `fileExtension`, `contentType`, `export(params) → { data, contentType, filename }`
- **Registry:** `exportRegistry` in `registry.ts` — `register()`, `get(key)`, `list()`
- **Built-in plugins:** `json-exporter.ts`, `csv-exporter.ts`, `stix-exporter.ts`
- **Barrel:** `index.ts` imports and registers all built-in exporters
- **Discovery:** `GET /api/export-formats` returns available formats; frontend renders export buttons dynamically

**Adding a new export plugin:**
1. Create `apps/server/src/plugins/exporters/my-exporter.ts` implementing `ExportPlugin`
2. Add one line to `exporters/index.ts`: `exportRegistry.register(myExporter);`
3. No frontend changes needed — buttons appear automatically

**Future plugin types** (same registry pattern, not yet implemented):
- **Enrichment plugins** — IOC lookups against external services (VirusTotal, Shodan, AbuseIPDB)
- **IOC pattern plugins** — custom indicator types (YARA rules, Bitcoin addresses, MITRE ATT&CK IDs)
- **Import plugins** — ingest from MISP, OpenCTI, TAXII feeds
- **Notification plugins** — webhooks, Slack alerts on IOC detection

Each future plugin type follows the same approach: define an interface in `packages/shared/src/types/`, create a registry in `apps/server/src/plugins/`, refactor existing hardcoded logic into plugin objects.

### Current State

Frontend and backend are fully built and wired together. All pages fetch real data from the backend API (no mock data remains). Auth flow (email/password + Google/GitHub OAuth) is complete. To run end-to-end: start Docker (Postgres + Redis), push schema, seed data, start server (port 3002) and web app (port 3000).

**Working features:**
- Note CRUD with debounced auto-save (content + title)
- Note visibility toggle (private/workspace) with label
- Note sharing with per-note permissions (by email)
- Note pinning
- Note duplication and soft-delete
- Edit/Preview toggle in editor (WYSIWYG ↔ rendered preview)
- **Drawing support** — Full-page Excalidraw drawings (separate note type) and embedded drawing blocks in text notes (via Tiptap extension). Shapes, arrows, freehand, text, colors, thickness, dark theme.
- Tag CRUD (create inline in note editor, delete from sidebar)
- Folder tree with subfolders and notes displayed inside folders (PenTool icon for drawings, FileText icon for text notes)
- IOC extraction (on-demand, deduplicates, clears stale data)
- IOC export: plugin-based — JSON, CSV, STIX 2.1 built-in (community can add more via export plugin system)
- Version history with auto-snapshots (every 5 min) and manual restore
- Export note as Markdown
- Full-text search
- Workspace member management (invite, role change, remove)
- Workspace settings with tabbed navigation (General / Members / Audit Log)
- Dashboard with recent/pinned notes
- Command palette (Ctrl+K)
- "ThreatPad" header links to dashboard

**Sharing scope:**
- Workspaces: shared via Members management (invite by email, assign owner/editor/viewer roles)
- Folders: inherit workspace permissions (no separate sharing)
- Notes: individual sharing via Share button (per-note permissions by email)

Claude Code Rules:
1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY


CRITICAL: When debugging, you MUST trace through the ENTIRE code flow step by step. No assumptions. No shortcuts.
