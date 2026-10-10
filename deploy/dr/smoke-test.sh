#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/dr/docker-compose.smoke.yml"
BACKUP_DIR="$(mktemp -d)"
export BARBERTRIX_DB_PASSWORD='BarberTrix_DR_2026!Secure'
export BARBERTRIX_COMPOSE_FILE="$COMPOSE_FILE"
export BARBERTRIX_ENV_FILE="$BACKUP_DIR/nonexistent.env"
export BARBERTRIX_BACKUP_DIR="$BACKUP_DIR"
export BARBERTRIX_BACKUP_RETENTION_DAYS=0
export BARBERTRIX_RESTART_API=false

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

cleanup() {
  compose --profile ops down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

compose up -d sqlserver

ready=false
for _ in $(seq 1 60); do
  if compose exec -T sqlserver /bin/bash -lc '
    if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then SQLCMD=/opt/mssql-tools18/bin/sqlcmd; else SQLCMD=/opt/mssql-tools/bin/sqlcmd; fi
    "$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "SELECT 1" >/dev/null
  ' 2>/dev/null; then
    ready=true
    break
  fi
  sleep 2
done

if [[ "$ready" != true ]]; then
  echo "SQL Server did not become ready for the DR rehearsal." >&2
  exit 1
fi

compose exec -T sqlserver /bin/bash -lc '
  if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then SQLCMD=/opt/mssql-tools18/bin/sqlcmd; else SQLCMD=/opt/mssql-tools/bin/sqlcmd; fi
  "$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "
    IF DB_ID(N'"'"'BarberTrixDb'"'"') IS NULL CREATE DATABASE [BarberTrixDb];
    USE [BarberTrixDb];
    IF OBJECT_ID(N'"'"'dbo.DrSentinel'"'"', N'"'"'U'"'"') IS NOT NULL DROP TABLE dbo.DrSentinel;
    CREATE TABLE dbo.DrSentinel (Value nvarchar(64) NOT NULL);
    INSERT INTO dbo.DrSentinel(Value) VALUES (N'"'"'before-backup'"'"');
  "
'
compose --profile ops run --rm -T --no-deps ops -c \
  "printf '%s\n' 'before-media' > /data/dr-sentinel.txt"

bash "$ROOT_DIR/deploy/ops/backup.sh"
MANIFEST="$(find "$BACKUP_DIR" -maxdepth 1 -name 'barbertrix-*.manifest' -print -quit)"
if [[ -z "$MANIFEST" ]]; then
  echo "Backup rehearsal did not produce a manifest." >&2
  exit 1
fi

compose exec -T sqlserver /bin/bash -lc '
  if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then SQLCMD=/opt/mssql-tools18/bin/sqlcmd; else SQLCMD=/opt/mssql-tools/bin/sqlcmd; fi
  "$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "UPDATE [BarberTrixDb].dbo.DrSentinel SET Value=N'"'"'after-backup'"'"';"
'
compose --profile ops run --rm -T --no-deps ops -c \
  "printf '%s\n' 'after-media' > /data/dr-sentinel.txt"

bash "$ROOT_DIR/deploy/ops/restore.sh" --confirm-restore "$MANIFEST"

DB_VALUE="$(compose exec -T sqlserver /bin/bash -lc '
  if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then SQLCMD=/opt/mssql-tools18/bin/sqlcmd; else SQLCMD=/opt/mssql-tools/bin/sqlcmd; fi
  "$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -h -1 -W -Q "SET NOCOUNT ON; SELECT Value FROM [BarberTrixDb].dbo.DrSentinel;"
' | tr -d '\r' | xargs)"
MEDIA_VALUE="$(compose --profile ops run --rm -T --no-deps ops -c 'cat /data/dr-sentinel.txt' | tr -d '\r' | xargs)"

if [[ "$DB_VALUE" != "before-backup" ]]; then
  echo "Database restore rehearsal failed: expected before-backup, got '$DB_VALUE'." >&2
  exit 1
fi
if [[ "$MEDIA_VALUE" != "before-media" ]]; then
  echo "Media restore rehearsal failed: expected before-media, got '$MEDIA_VALUE'." >&2
  exit 1
fi

echo "DR rehearsal passed: database and shop-media were restored to the backed-up state."
