# ThreatPad

A collaborative, real-time note-taking platform built for Cyber Threat Intelligence (CTI) and security operations teams.

ThreatPad combines the speed of modern productivity tools with CTI-specific capabilities: IOC auto-extraction, STIX 2.1 export, structured threat templates, and fine-grained access control.

**[Live Demo](https://threat-pad-web.vercel.app)** — login with `demo@threatpad.io` / `password123`

![WhatsApp Image 2026-03-26 at 8 39 17 PM (2)](https://github.com/user-attachments/assets/2470dcb1-6aea-425c-9fbe-75e809c3c62b)

## Features

- **Rich Editor** — WYSIWYG with syntax highlighting, tables, task lists, Edit/Preview toggle
- **IOC Auto-Extraction** — Detects IPs, domains, URLs, hashes, emails, CVEs from note content
- **Plugin-Based Exports** — JSON, CSV, STIX 2.1 built-in. [Add your own](#writing-plugins) with a single file
- **CTI Templates** — IOC Dump, Threat Actor Profile, Incident Notes, Campaign Tracker
- **Workspaces & Folders** — Nested folders, multiple workspaces, tag-based filtering
- **Access Control** — Workspace RBAC (owner/editor/viewer), per-note sharing, private notes
- **Version History** — Auto-snapshots every 5 min, diff view, one-click restore
- **Full-Text Search** — Postgres-backed substring + stemmed search
- **Audit Logging** — Track all user actions across workspaces
- **Self-Hosted** — Your data stays on your network
  
![WhatsApp Image 2026-03-26 at 8 39 17 PM (1)](https://github.com/user-attachments/assets/c03dc6f4-c535-4584-aca9-49567c6a2721)

## Quick Install

Requires [Docker](https://docker.com/). That's it.

```bash
git clone https://github.com/bhavikmalhotra/ThreatPad.git
cd ThreatPad
docker compose -f docker-compose.prod.yml up -d --build
```

Open **http://localhost:3000** — you'll be guided through creating your admin account.

This starts PostgreSQL, Redis, the API server, and the web app. Database schema is applied automatically.

## Development Setup

Requires [Node.js 22+](https://nodejs.org/) and [pnpm 9+](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env
docker compose up -d          # Postgres + Redis
pnpm --filter @threatpad/db push
pnpm --filter @threatpad/db seed   # optional demo data
pnpm dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3002
- **Demo login:** `demo@threatpad.io` / `password123` (if seeded)

## Writing Plugins

ThreatPad uses a registry-based plugin system. Export is the first plugin type — more are planned.

Create a file in `apps/server/src/plugins/exporters/`:

```typescript
import type { ExportPlugin } from '@threatpad/shared/types';

export const myExporter: ExportPlugin = {
  key: 'myformat',
  label: 'My Format',
  fileExtension: '.xml',
  contentType: 'application/xml',
  async export({ noteId, iocs, note }) {
    const xml = buildXml(iocs);
    return { data: xml, contentType: 'application/xml', filename: `iocs-${noteId}.xml` };
  },
};
```

Register it in `apps/server/src/plugins/exporters/index.ts`:

```typescript
import { myExporter } from './my-exporter.js';
exportRegistry.register(myExporter);
```

The frontend auto-discovers new formats — no UI changes needed.

| Plugin Type | Use Case | Status |
|-------------|----------|--------|
| **Export** | IOC export formats (STIX, CSV, MISP, OpenIOC) | Available |
| **Enrichment** | IOC lookups (VirusTotal, Shodan, AbuseIPDB) | Planned |
| **IOC Patterns** | Custom indicator types (YARA, Bitcoin, MITRE ATT&CK) | Planned |
| **Import** | Ingest from feeds (TAXII, MISP, OpenCTI) | Planned |

## Documentation

- [Configuration & Environment Variables](docs/configuration.md)
- [API Reference](docs/api.md)
- [Architecture](docs/architecture.md)

## License

[MIT](LICENSE)
