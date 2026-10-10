#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${BARBERTRIX_COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${BARBERTRIX_ENV_FILE:-$ROOT_DIR/.env.production}"
DATABASE_NAME="BarberTrixDb"

usage() {
  cat <<'USAGE'
Usage:
  bash deploy/ops/restore.sh --confirm-restore /path/to/barbertrix-YYYYMMDDTHHMMSSZ.manifest

The command is destructive. It replaces BarberTrixDb and shop-media with the selected backup set.
USAGE
}

if [[ "${1:-}" != "--confirm-restore" || $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

MANIFEST_PATH="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Manifest not found: $MANIFEST_PATH" >&2
  exit 1
fi

BACKUP_DIR="$(dirname "$MANIFEST_PATH")"

read_manifest() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted { sub(/^[^=]*=/, ""); print; exit }' "$MANIFEST_PATH"
}

FORMAT="$(read_manifest format)"
MANIFEST_DATABASE="$(read_manifest database)"
DATABASE_FILE="$(read_manifest database_file)"
MEDIA_FILE="$(read_manifest media_file)"
CHECKSUM_FILE="$(read_manifest checksum_file)"

if [[ "$FORMAT" != "barbertrix-backup-v1" ]]; then
  echo "Unsupported backup manifest format: $FORMAT" >&2
  exit 1
fi
if [[ "$MANIFEST_DATABASE" != "$DATABASE_NAME" ]]; then
  echo "Backup targets unexpected database: $MANIFEST_DATABASE" >&2
  exit 1
fi
for file in "$DATABASE_FILE" "$MEDIA_FILE" "$CHECKSUM_FILE"; do
  if ! [[ "$file" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "Unsafe filename in manifest: $file" >&2
    exit 1
  fi
  if [[ ! -f "$BACKUP_DIR/$file" ]]; then
    echo "Backup component missing: $BACKUP_DIR/$file" >&2
    exit 1
  fi
done

(
  cd "$BACKUP_DIR"
  sha256sum -c "$CHECKSUM_FILE"
)

compose_args=(-f "$COMPOSE_FILE")
if [[ -f "$ENV_FILE" ]]; then
  compose_args=(--env-file "$ENV_FILE" "${compose_args[@]}")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

if ! compose ps --services --status running | grep -qx sqlserver; then
  echo "The sqlserver service must be running before restore." >&2
  exit 1
fi

web_was_running=false
api_was_running=false
if compose config --services | grep -qx web && compose ps --services --status running | grep -qx web; then
  web_was_running=true
  compose stop web
fi
if compose config --services | grep -qx api && compose ps --services --status running | grep -qx api; then
  api_was_running=true
  compose stop api
fi

restore_succeeded=false
cleanup() {
  compose --profile ops run --rm -T --no-deps ops -c \
    "rm -f '/backups/$DATABASE_FILE' '/backups/$MEDIA_FILE'" >/dev/null 2>&1 || true
  if [[ "$restore_succeeded" == true && "${BARBERTRIX_RESTART_API:-true}" == true ]]; then
    if [[ "$api_was_running" == true ]]; then
      compose start api >/dev/null
    fi
    if [[ "$web_was_running" == true ]]; then
      compose start web >/dev/null
    fi
  elif [[ "$restore_succeeded" != true && ( "$api_was_running" == true || "$web_was_running" == true ) ]]; then
    echo "Restore failed; application services remain stopped for operator inspection." >&2
  fi
}
trap cleanup EXIT

cat "$BACKUP_DIR/$DATABASE_FILE" | compose --profile ops run --rm -T --no-deps ops -c \
  "cat > '/backups/$DATABASE_FILE'"
cat "$BACKUP_DIR/$MEDIA_FILE" | compose --profile ops run --rm -T --no-deps ops -c \
  "cat > '/backups/$MEDIA_FILE'"

RESTORE_SQL=$(cat <<SQL
IF DB_ID(N'$DATABASE_NAME') IS NOT NULL
BEGIN
  ALTER DATABASE [$DATABASE_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END;
BEGIN TRY
  RESTORE DATABASE [$DATABASE_NAME]
  FROM DISK = N'/var/opt/mssql/backups/$DATABASE_FILE'
  WITH REPLACE, RECOVERY, CHECKSUM, STATS = 10;
  ALTER DATABASE [$DATABASE_NAME] SET MULTI_USER;
END TRY
BEGIN CATCH
  IF DB_ID(N'$DATABASE_NAME') IS NOT NULL
  BEGIN
    ALTER DATABASE [$DATABASE_NAME] SET MULTI_USER;
  END;
  THROW;
END CATCH;
SQL
)

compose exec -T -e "BARBERTRIX_RESTORE_SQL=$RESTORE_SQL" sqlserver /bin/bash -lc '
  set -Eeuo pipefail
  if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then
    SQLCMD=/opt/mssql-tools18/bin/sqlcmd
  elif [[ -x /opt/mssql-tools/bin/sqlcmd ]]; then
    SQLCMD=/opt/mssql-tools/bin/sqlcmd
  else
    echo "sqlcmd was not found in the SQL Server container." >&2
    exit 1
  fi
  "$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "$BARBERTRIX_RESTORE_SQL"
'

compose --profile ops run --rm -T --no-deps ops -c \
  "find /data -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -C /data -xzf '/backups/$MEDIA_FILE'"

restore_succeeded=true

echo "Restore completed successfully from: $MANIFEST_PATH"
echo "Run application health checks before reopening traffic."
