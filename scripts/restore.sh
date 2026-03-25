#!/usr/bin/env bash
set -euo pipefail

# ThreatPad Database Restore Script
# Usage: ./scripts/restore.sh <backup_file>
#
# Environment variables:
#   DATABASE_URL  — PostgreSQL connection string (default: from .env)
#   COMPOSE_FILE  — Docker compose file (default: docker-compose.prod.yml)
#
# Examples:
#   ./scripts/restore.sh backups/threatpad_20260324_120000.sql.gz
#   DATABASE_URL=postgres://... ./scripts/restore.sh backup.sql.gz

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -1t "$PROJECT_DIR/backups"/threatpad_*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

echo "ThreatPad Database Restore"
echo "=========================="
echo "Backup: $BACKUP_FILE"
echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

# Try docker compose first, fall back to direct psql
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ -f "$PROJECT_DIR/$COMPOSE_FILE" ] && command -v docker &>/dev/null; then
  CONTAINER=$(docker compose -f "$PROJECT_DIR/$COMPOSE_FILE" ps -q postgres 2>/dev/null || true)
fi

if [ -n "${CONTAINER:-}" ] && [ -n "$CONTAINER" ]; then
  echo "Using Docker container for restore..."
  gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U postgres -d threatpad
elif [ -n "${DATABASE_URL:-}" ]; then
  echo "Using direct connection for restore..."
  gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
  echo "Error: No DATABASE_URL set and no Docker container found."
  echo "Set DATABASE_URL or ensure Docker containers are running."
  exit 1
fi

echo ""
echo "Restore complete."
