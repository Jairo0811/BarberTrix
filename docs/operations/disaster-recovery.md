# BarberTrix backup and disaster recovery runbook

This runbook covers the two durable production data stores used by BarberTrix:

1. SQL Server database `BarberTrixDb`.
2. `barbertrix-shop-media`, which contains uploaded Marketplace/public-profile media.

A backup is not considered durable until the complete backup set has been copied off the application host to encrypted storage.

## Recovery objectives

For the release-candidate stage, the minimum operating policy is:

- **Minimum RPO:** 24 hours when one verified backup is executed daily.
- **Production target RPO:** 6 hours once a scheduler/off-host destination is configured at that cadence.
- **Target RTO:** 60 minutes from the start of operator recovery to application health verification.
- **Restore rehearsal:** at least quarterly and before a major infrastructure migration.

These are operational targets, not contractual SLAs, until measured in the real production environment.

## What each backup contains

`deploy/ops/backup.sh` creates one timestamped set:

- `barbertrix-<timestamp>.bak` — SQL Server native backup using `COPY_ONLY` and checksums (compatible with the production SQL Server Express edition).
- `barbertrix-<timestamp>-media.tar.gz` — complete `shop-media` volume archive.
- `barbertrix-<timestamp>.sha256` — integrity hashes for both payloads.
- `barbertrix-<timestamp>.manifest` — format/version metadata and filenames.

The database backup is immediately checked with `RESTORE VERIFYONLY ... WITH CHECKSUM` before it is exported from the Docker backup volume.

Backups contain production data and can include personal information. Never commit them to Git, attach them to issues, or keep the only copy on the application host.

## Create a backup

Production SQL Server must already be running. By default the script briefly stops Web/API while SQL and media are captured so the two stores represent one application-consistent point in time.

```bash
BARBERTRIX_BACKUP_DIR=/secure/local/path \
BARBERTRIX_BACKUP_RETENTION_DAYS=14 \
BARBERTRIX_BACKUP_QUIESCE_APP=true \
bash deploy/ops/backup.sh
```

Defaults:

- backup directory: `./backups`;
- local retention: 14 days (`0` disables automatic local pruning);
- application quiescing: enabled by default (`BARBERTRIX_BACKUP_QUIESCE_APP=true`);
- compose file: `docker-compose.production.yml`;
- env file: `.env.production` when it exists.

Disabling quiescing is supported for emergency/no-downtime operation, but it can allow SQL/media skew if an upload changes while the backup is being captured; it should not be the normal commercial policy.

After the command succeeds:

1. Copy all four files in the set to encrypted off-host/object storage.
2. Verify the object-store copy or checksum there.
3. Keep at least one copy outside the Docker host/failure domain.
4. Record the manifest timestamp in the operational log.

A sensible 3-2-1 implementation is a local short-retention copy plus encrypted object storage in a separate failure domain, with bucket versioning/immutability where available.

## Restore

**Restore is destructive.** Schedule a maintenance window and take a safety backup of the current state first when the host is still readable.

Place all four files for one backup set in the same directory and run:

```bash
bash deploy/ops/restore.sh \
  --confirm-restore \
  /secure/local/path/barbertrix-20261010T050000Z.manifest
```

The restore process:

1. Validates the manifest format and expected database name.
2. Verifies SHA-256 hashes before modifying anything.
3. Stops Web/API application services when they are currently running, creating a maintenance window for the restore.
4. Restores `BarberTrixDb` using SQL Server `WITH REPLACE`, `RECOVERY` and `CHECKSUM`.
5. Replaces the contents of `shop-media` with the archived snapshot.
6. Restarts the application services only after both restores succeed.

If restore fails after application services were stopped, the script intentionally leaves them stopped for operator inspection.

## Post-restore verification

Do not reopen traffic until all applicable checks pass:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Then verify:

- API health endpoint is healthy.
- Owner login succeeds.
- A known barber shop and its current queue can be read.
- A known uploaded Marketplace image loads.
- SignalR reconnects and current operations can update.
- Billing/subscription state is readable; do not replay provider webhooks manually unless reconciliation requires it.

Record start/end timestamps to measure actual RTO.

## Automated restore rehearsal in CI

`deploy/dr/smoke-test.sh` creates an isolated SQL Server + media volume, writes sentinel values, creates a real backup, corrupts both sources, restores the set, and asserts that both original sentinel values return.

The `Disaster recovery rehearsal` CI job runs this on pull requests and `main`. A green job proves that the repository's backup/restore mechanics work against SQL Server 2022; it does **not** prove that an external production backup scheduler or cloud bucket is configured.

## Scheduling and off-host storage gate

This repository deliberately does not hard-code a cloud vendor or credentials. Before commercial production launch, infrastructure must provide:

- scheduled execution at the chosen RPO cadence;
- encrypted off-host/object storage;
- retention/versioning policy;
- access restricted to backup operators/service identity;
- monitoring for missed/failed backups;
- a periodic restore rehearsal using a non-production environment.

Until those external controls exist, BarberTrix has verified backup/restore tooling but not a complete production backup service.
