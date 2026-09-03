#!/usr/bin/env bash
set -euo pipefail

SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
if [[ ! -x "$SQLCMD" ]]; then
  SQLCMD="/opt/mssql-tools/bin/sqlcmd"
fi

if [[ ! -x "$SQLCMD" ]]; then
  echo "sqlcmd was not found in the SQL Server image." >&2
  exit 1
fi

: "${BARBERTRIX_DB_PASSWORD:?Set BARBERTRIX_DB_PASSWORD}"
: "${BARBERTRIX_DB_APP_PASSWORD:?Set BARBERTRIX_DB_APP_PASSWORD}"
: "${BARBERTRIX_DB_MIGRATOR_PASSWORD:?Set BARBERTRIX_DB_MIGRATOR_PASSWORD}"

escape_sql_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

APP_PASSWORD_ESCAPED="$(escape_sql_literal "$BARBERTRIX_DB_APP_PASSWORD")"
MIGRATOR_PASSWORD_ESCAPED="$(escape_sql_literal "$BARBERTRIX_DB_MIGRATOR_PASSWORD")"

"$SQLCMD" \
  -S sqlserver,1433 \
  -U sa \
  -P "$BARBERTRIX_DB_PASSWORD" \
  -C \
  -b \
  -i /bootstrap/bootstrap.sql \
  -v APP_PASSWORD="$APP_PASSWORD_ESCAPED" MIGRATOR_PASSWORD="$MIGRATOR_PASSWORD_ESCAPED"
