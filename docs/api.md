# API Reference

Base URL: `http://localhost:3002`

## Authentication

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login, returns JWT |
| `POST /api/auth/refresh` | Refresh access token |
| `POST /api/auth/logout` | Logout, invalidates refresh token |
| `GET /api/auth/me` | Get current user |
| `PATCH /api/auth/me` | Update profile |
| `POST /api/auth/change-password` | Change password |

## Workspaces

| Endpoint | Description |
|----------|-------------|
| `GET /api/workspaces` | List workspaces |
| `POST /api/workspaces` | Create workspace |
| `GET /api/workspaces/:id` | Get workspace |
| `PATCH /api/workspaces/:id` | Update workspace |
| `POST /api/workspaces/:id/members` | Invite member |
| `PATCH /api/workspaces/:id/members/:userId` | Change member role |
| `DELETE /api/workspaces/:id/members/:userId` | Remove member |

## Notes

| Endpoint | Description |
|----------|-------------|
| `GET /api/workspaces/:id/notes` | List notes |
| `POST /api/workspaces/:id/notes` | Create note |
| `GET /api/workspaces/:id/notes/:noteId` | Get note |
| `PATCH /api/workspaces/:id/notes/:noteId` | Update note metadata |
| `PUT /api/workspaces/:id/notes/:noteId/content` | Update note content |
| `DELETE /api/workspaces/:id/notes/:noteId` | Soft-delete note |
| `POST /api/workspaces/:id/notes/:noteId/duplicate` | Duplicate note |

## IOCs

| Endpoint | Description |
|----------|-------------|
| `POST /api/notes/:noteId/extract-iocs` | Extract IOCs from note |
| `GET /api/notes/:noteId/iocs` | List extracted IOCs |
| `GET /api/notes/:noteId/iocs/export?format=json` | Export IOCs (json, csv, stix) |
| `DELETE /api/notes/:noteId/iocs/:iocId` | Delete IOC |
| `GET /api/export-formats` | List available export plugins |

## Search, Tags, Versions

| Endpoint | Description |
|----------|-------------|
| `GET /api/workspaces/:id/search?q=query` | Full-text search |
| `GET /api/workspaces/:id/tags` | List tags |
| `POST /api/workspaces/:id/tags` | Create tag |
| `POST /api/workspaces/:id/notes/:noteId/tags` | Add tags to note |
| `GET /api/notes/:noteId/versions` | List versions |
| `POST /api/notes/:noteId/versions` | Create manual snapshot |
| `POST /api/notes/:noteId/versions/:versionId/restore` | Restore version |

## Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (DB + Redis status) |
| `GET /api/workspaces/:id/audit-logs` | Audit log |

See the full route implementations in `apps/server/src/routes/`.
