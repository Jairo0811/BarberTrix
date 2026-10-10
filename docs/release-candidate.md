# BarberTrix v1 release candidate

BarberTrix is treated as **code-complete for Release Candidate** when the repository gates in `docs/test-matrix.md` are green. This does not by itself mean the commercial production environment or mobile stores are accepted.

## RC baseline

The RC baseline includes:

- hardened authentication/session lifecycle;
- Web and Mobile accessibility policy gates;
- Web, Mobile and TV surfaces backed by the shared .NET/SQL Server source of truth;
- PayPal subscription integration with signed-webhook handling;
- EAS-linked Mobile configuration with stable package/bundle identifiers;
- account deletion across API, Web and Mobile, including a stable public deletion resource;
- verified SQL Server + shop-media backup/restore tooling and CI disaster-recovery rehearsal;
- production Compose validation and Docker image builds;
- security, backend, frontend, Mobile, Playwright and full-stack CI gates.

## RC checklist

### Repository gates

- [ ] Security workflow green on the RC commit.
- [ ] Backend build/tests/coverage/migration validation green.
- [ ] Frontend audit/tests/coverage/build green.
- [ ] Mobile audit/alignment/typecheck/i18n/reliability/Android/iOS green.
- [ ] Playwright E2E green.
- [ ] Full-stack E2E green.
- [ ] Disaster recovery rehearsal green.
- [ ] Production Compose validation green.
- [ ] API and Web production Docker images build successfully.
- [ ] No unintended pending EF model changes.
- [ ] `docs/test-matrix.md` reviewed against the current CI workflow.

### Production environment

- [ ] Production DNS and HTTPS/TLS configured and verified.
- [ ] Production secrets supplied outside source control.
- [ ] SMTP acceptance completed.
- [ ] Turnstile acceptance completed.
- [ ] PayPal Live controlled checkout/webhook/cancel acceptance completed.
- [ ] Health/logging/metrics connected to a real monitoring destination.
- [ ] Alerts proven for API 5xx/down, SQL failure, PayPal failure, storage pressure and TLS expiry.
- [ ] Backup scheduler configured.
- [ ] Backups copied to encrypted off-host storage with retention/versioning.
- [ ] Restore rehearsal performed from a real off-host production-like backup and RPO/RTO recorded.

### Mobile/store acceptance

- [ ] App Store Connect record and Apple signing/provisioning ready.
- [ ] APNs credentials configured and tested on a production-signed physical device.
- [ ] Google Play app/signing ready.
- [ ] FCM v1 configured and tested on a production-signed physical device.
- [ ] OAuth/deep links verified on installed iOS and Android builds.
- [ ] Account deletion verified on installed builds.
- [ ] Public `/account-deletion.html`, Privacy and Terms URLs verified over HTTPS.
- [ ] Icons, splash, screenshots and store metadata visually approved.
- [ ] Apple privacy declarations / Google Data Safety reviewed against actual app behavior.
- [ ] Upgrade/reinstall/session-restoration physical-device matrix completed.

### Legal/commercial acceptance

- [ ] Operator/legal entity identified in Privacy and Terms.
- [ ] Applicable jurisdiction and contact/support details finalized.
- [ ] Data-retention periods reviewed and published.
- [ ] Refund/cancellation/tax language reviewed.
- [ ] Store privacy disclosures match the final policy and product behavior.

## Tagging policy

Recommended sequence:

1. merge all RC code/documentation gates to `main`;
2. create an RC tag such as `v1.0.0-rc.1` only from a green `main` commit;
3. perform production/staging and physical-device acceptance against that exact build;
4. fix any acceptance blocker through a new PR and produce the next RC tag;
5. create `v1.0.0` only when the release owner has accepted every applicable external/legal gate.

Do not retag an existing RC after code changes. Every materially different candidate receives a new immutable RC tag.

## Known external gates

The repository cannot prove ownership/configuration of DNS, SMTP, Turnstile, PayPal Live credentials, Apple/Google developer accounts, APNs/FCM credentials, monitoring destinations, off-host backup storage, or final legal approval. These are deliberate acceptance gates, not hidden TODOs and must remain visible until evidence exists.

See also:

- `docs/test-matrix.md`
- `docs/mobile-release.md`
- `docs/account-deletion.md`
- `docs/operations/disaster-recovery.md`
- `docs/privacy.md`
