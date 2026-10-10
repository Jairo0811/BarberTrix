#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${BARBERTRIX_COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${BARBERTRIX_ENV_FILE:-$ROOT_DIR/.env.production}"
BACKUP_DIR="${BARBERTRIX_BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${BARBERTRIX_BACKUP_RETENTION_DAYS:-14}"
QUIESCE_APP="${BARBERTRIX_BACKUP_QUIESCE_APP:-true}"
DATABASE_NAME="BarberTrixDb"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PREFIX="barbertrix-$TIMESTAMP"
DATABASE_FILE="$PREFIX.bak"
MEDIA_FILE="$PREFIX-media.tar.gz"
CHECKSUM_FILE="$PREFIX.sha256"
MANIFEST_FILE="$PREFIX.manifest"

compose_args=(-f "$COMPOSE_FILE")
if [[ -f "$ENV_FILE" ]]; then
  compose_args=(--env-file "$ENV_FILE" "${compose_args[@]}")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

web_was_running=false
api_was_running=false

cleanup() {
  compose --profile ops run --rm -T --no-deps ops -c \
    "rm -f '/backups/$DATABASE_FILE' '/backups/$MEDIA_FILE'" >/dev/null 2>&1 || true
  if [[ "$api_was_running" == true ]]; then
    compose start api >/dev/null 2>&1 || true
  fi
  if [[ "$web_was_running" == true ]]; then
    compose start web >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

require_command docker
require_command sha256sum

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BARBERTRIX_BACKUP_RETENTION_DAYS must be a non-negative integer." >&2
  exit 1
fi
if [[ "$QUIESCE_APP" != true && "$QUIESCE_APP" != false ]]; then
  echo "BARBERTRIX_BACKUP_QUIESCE_APP must be true or false." >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"

if ! compose ps --services --status running | grep -qx sqlserver; then
  echo "The sqlserver service must be running before a backup can be created." >&2
  exit 1
fi

SQL_UID="$(compose exec -T sqlserver stat -c %u /var/opt/mssql/data | tr -d '\r\n')"
SQL_GID="$(compose exec -T sqlserver stat -c %g /var/opt/mssql/data | tr -d '\r\n')"
if ! [[ "$SQL_UID" =~ ^[0-9]+$ && "$SQL_GID" =~ ^[0-9]+$ ]]; then
  echo "Unable to determine the SQL Server container uid/gid." >&2
  exit 1
fi
compose --profile ops run --rm -T --no-deps ops -c \
  "chown $SQL_UID:$SQL_GID /backups && chmod 0770 /backups"

if [[ "$QUIESCE_APP" == true ]]; then
  if compose config --services | grep -qx web && compose ps --services --status running | grep -qx web; then
    web_was_running=true
    compose stop web
  fi
  if compose config --services | grep -qx api && compose ps --services --status running | grep -qx api; then
    api_was_running=true
    compose stop api
  fi
fi

SQL_SCRIPT=$(cat <<SQL
BACKUP DATABASE [$DATABASE_NAME]
TO DISK = N'/var/opt/mssql/backups/$DATABASE_FILE'
WITH COPY_ONLY, INIT, CHECKSUM, STATS = 10;
RESTORE VERIFYONLY
FROM DISK = N'/var/opt/mssql/backups/$DATABASE_FILE'
WITH CHECKSUM;
SQL
)

compose exec -T -e "BARBERTRIX_BACKUP_SQL=$SQL_SCRIPT" sqlserver /bin/bash -lc '
  set -Eeuo pipefail
  if [[ -x /opt/mssql-tools18/bin/sqlcmd ]]; then
    SQLCMD=/opt/mssql-tools18/bin/sqlcmd
  elif [[ -x /opt/mssql-tools/bin/sqlcmd ]]; then
    SQLCMD=/opt/mssql-tools/bin/sqlcmd
  else
    echo "sqlcmd was not found in the SQL Server container." >&2
    exit 1
  fi
  "$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "$BARBERTRIX_BACKUP_SQL"
'

compose --profile ops run --rm -T --no-deps ops -c \
  "tar -C /data -czf '/backups/$MEDIA_FILE' ."

compose --profile ops run --rm -T --no-deps ops -c \
  "cat '/backups/$DATABASE_FILE'" > "$BACKUP_DIR/$DATABASE_FILE"
compose --profile ops run --rm -T --no-deps ops -c \
  "cat '/backups/$MEDIA_FILE'" > "$BACKUP_DIR/$MEDIA_FILE"

(
  cd "$BACKUP_DIR"
  sha256sum "$DATABASE_FILE" "$MEDIA_FILE" > "$CHECKSUM_FILE"
)

cat > "$BACKUP_DIR/$MANIFEST_FILE" <<MANIFEST
format=barbertrix-backup-v1
created_utc=$TIMESTAMP
database=$DATABASE_NAME
database_file=$DATABASE_FILE
media_file=$MEDIA_FILE
checksum_file=$CHECKSUM_FILE
MANIFEST

if (( RETENTION_DAYS > 0 )); then
  find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name 'barbertrix-*.bak' -o -name 'barbertrix-*-media.tar.gz' -o -name 'barbertrix-*.sha256' -o -name 'barbertrix-*.manifest' \) \
    -mtime "+$RETENTION_DAYS" -delete
fi

echo "Backup set created and verified:"
echo "  $BACKUP_DIR/$MANIFEST_FILE"
echo "Copy the complete set off-host to encrypted storage before considering the backup durable."
