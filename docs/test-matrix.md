# BarberTrix release-candidate test matrix

This matrix is the source of truth for the BarberTrix v1 release candidate. A check is **Automated** only when the repository/CI can prove it without production credentials or human store acceptance. External gates must not be marked complete based on mocks, local builds, or documentation alone.

## Automated release gates

| Surface | Gate | Evidence | RC requirement |
|---|---|---|---|
| Backend | `dotnet restore` + Release build | GitHub Actions `Backend (.NET 10)` | Required |
| Backend | dependency vulnerability audit | `dotnet list ... --vulnerable --include-transitive` | Required |
| Backend | integration/unit tests + coverage | `dotnet test` + critical coverage gate | Required |
| Database | no pending EF model changes + idempotent migration script | backend CI migration validation | Required |
| Frontend | production dependency audit | `npm audit --omit=dev --audit-level=high` | Required |
| Frontend | tests + coverage + production build | React CI job | Required |
| Web E2E | browser regression suite | Playwright E2E | Required |
| Full stack | React + API + SQL Server real integration | Full-stack E2E | Required |
| Mobile | dependency alignment | `expo install --check` | Required |
| Mobile | TypeScript + i18n + reliability tests | Mobile CI job | Required |
| Mobile | Android export | Expo Android bundle/export | Required |
| Mobile | iOS export | Expo iOS bundle/export | Required |
| Security | secret/dependency/static-analysis workflow | GitHub Actions `Security` | Required |
| DR | SQL + shop-media backup/restore rehearsal | `Disaster recovery rehearsal` | Required |
| Production topology | Compose interpolation/config validation | `docker compose ... config --quiet` | Required |
| Containers | API production image build | `backend/Dockerfile` | Required |
| Containers | Web production image build | `frontend/Dockerfile` | Required |
| Account lifecycle | explicit destructive confirmation | backend integration tests | Required |
| Account lifecycle | Owner workspace tombstone + identity anonymization | backend integration tests | Required |
| Account lifecycle | immediate access/refresh-session revocation | backend integration tests | Required |

A PR intended for an RC tag must not merge with any required automated gate red or skipped because of an application failure.

## Production acceptance gates

These require the real deployment environment and are intentionally not simulated as completed by CI.

| Area | Acceptance evidence required | Current classification |
|---|---|---|
| DNS/TLS | production hostname resolves correctly; valid HTTPS chain; redirect/HSTS policy verified | External |
| SMTP | real verification/reset mail delivered; links return to production HTTPS | External |
| Turnstile | production site/secret keys; success and rejection paths verified | External |
| PayPal Live | controlled paid subscription, signed webhook, entitlement activation, cancellation and failure handling | External |
| Observability | 5xx/API-down/SQL/PayPal/storage/TLS alerts delivered to an owned on-call destination | External |
| Backup storage | scheduled backup copied to encrypted off-host storage with retention/versioning | External |
| DR | non-production restore drill from the actual off-host artifact; measured RPO/RTO | External |
| APNs | production-signed iOS device receives foreground/background/killed notifications | External |
| FCM v1 | production-signed Android device receives foreground/background/killed notifications | External |
| OAuth deep links | Google/Apple return successfully on installed production-signed builds | External |
| Store account deletion | deletion flow reachable and functional on installed builds; public deletion page reachable over HTTPS | External |
| App Store | provisioning, metadata, privacy declarations, screenshots and review submission accepted | External |
| Google Play | signing, Data Safety, deletion URL, metadata, screenshots and review submission accepted | External |
| Legal | final operator identity, jurisdiction, retention periods, refunds/support/contact and reviewed Privacy/Terms content | External/legal review |

## Physical-device acceptance

At minimum test one supported iOS device and one supported Android device with production-like signed builds:

1. fresh install and first launch;
2. login, logout, refresh/session restoration and expired-session recovery;
3. Google/Apple authentication where applicable;
4. Discovery, shop details, queue/request flows and appointments;
5. photo selection/upload and location permission deny/allow flows;
6. push opt-in/deny, foreground, background and killed-state delivery;
7. notification/deep-link navigation;
8. account deletion and inability to reuse the previous session;
9. upgrade from the previous accepted build without data/session corruption;
10. reinstall behavior and SecureStore/session expectations.

Record device model, OS version, build profile/version, date, tester and result in the release ticket or release evidence package.

## Release decision

- **RC code-complete:** all automated gates green.
- **Production-ready:** automated gates green **and** every applicable production acceptance gate has real evidence.
- **Store-ready:** production-ready plus physical-device and store metadata/privacy/signing acceptance.
- **v1.0.0:** tag only after the release owner accepts the remaining external/legal gates; do not infer them from CI.
