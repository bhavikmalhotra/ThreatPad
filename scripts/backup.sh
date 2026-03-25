#!/usr/bin/env bash
set -euo pipefail

# ThreatPad Database Backup Script
# Usage: ./scripts/backup.sh [output_dir]
#
# Environment variables:
#   DATABASE_URL  — PostgreSQL connection string (default: from .env)
#   COMPOSE_FILE  — Docker compose file (default: docker-compose.prod.yml)
#
# Examples:
#   ./scripts/backup.sh                          # Backup to ./backups/
#   ./scripts/backup.sh /mnt/backups             # Backup to custom dir
#   DATABASE_URL=postgres://... ./scripts/backup.sh  # Direct connection

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${1:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$OUTPUT_DIR/threatpad_${TIMESTAMP}.sql.gz"

# Load .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

mkdir -p "$OUTPUT_DIR"

echo "ThreatPad Database Backup"
echo "========================="
echo "Timestamp: $TIMESTAMP"
echo "Output:    $BACKUP_FILE"
echo ""

# Try docker compose first, fall back to direct pg_dump
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ -f "$PROJECT_DIR/$COMPOSE_FILE" ] && command -v docker &>/dev/null; then
  CONTAINER=$(docker compose -f "$PROJECT_DIR/$COMPOSE_FILE" ps -q postgres 2>/dev/null || true)
fi

if [ -n "${CONTAINER:-}" ] && [ -n "$CONTAINER" ]; then
  echo "Using Docker container for backup..."
  docker exec "$CONTAINER" pg_dump -U postgres --clean --if-exists threatpad | gzip > "$BACKUP_FILE"
elif [ -n "${DATABASE_URL:-}" ]; then
  echo "Using direct connection for backup..."
  pg_dump "$DATABASE_URL" --clean --if-exists | gzip > "$BACKUP_FILE"
else
  echo "Error: No DATABASE_URL set and no Docker container found."
  echo "Set DATABASE_URL or ensure Docker containers are running."
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "Backup complete: $BACKUP_FILE ($SIZE)"

# Keep only last 30 backups
BACKUP_COUNT=$(ls -1 "$OUTPUT_DIR"/threatpad_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 30 ]; then
  echo "Cleaning old backups (keeping last 30)..."
  ls -1t "$OUTPUT_DIR"/threatpad_*.sql.gz | tail -n +31 | xargs rm -f
fi
