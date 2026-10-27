# BarberTrix — Mobile dependency security

**Last verified:** 2026-10-27 · **Candidate:** [PR #126](https://github.com/Jairo0811/BarberTrix/pull/126) · **Stack:** Expo SDK 57 / React Native 0.86.3.

## Verified current baseline

Following a reproducible `npx expo install --fix` on GitHub Actions (with installation and commit permissions isolated in separate jobs), the current direct Expo dependencies are aligned:

- `expo ~57.0.31`;
- `expo-router ~57.0.29`;
- `expo-location ~57.0.22`;
- `expo-notifications ~57.0.24`;
- `expo-crypto ~57.0.4`, `expo-dev-client ~57.0.20`;
- `expo-linking ~57.0.13`.

The generated `mobile/package-lock.json` is committed. The isolated update job passed `expo install --check`, typecheck, i18n checks and **25/25 mobile tests**; the regular PR CI additionally tests Android and iOS exports.

**Production npm audit on 2026-10-27:** **6 reported package entries = 3 high, 3 moderate, 0 critical**. These six entries originate from **two root advisories**, *not* six independent application vulnerabilities.

| Root advisory | Locked dependency and path | Scope and remediation |
|---|---|---|
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — high | `zod@3.25.76` ← `@expo/cli@57.0.32` ← `expo@57.0.31` | Affects oversized constrained-collection validation. The advisory lists `4.6.6` as the first fixed release, but Expo CLI requires `zod ^3.25.76`. This is a Node/Expo tooling path in the lockfile; confirm shipped-app exposure before accepting an exception. Do not force Zod 4 into CLI without upstream compatibility evidence. |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) — moderate | `decode-uri-component@0.2.2` ← `query-string@7.1.3` ← `expo-router@57.0.29` | Malformed encoded input can cause excessive CPU usage. Patched package `0.5.0` is outside `query-string@7`'s declared `^0.2.2` range. Evaluate deep-link/query parsing reachability and upstream router fixes; test any future major-version override before adoption. |

### Changes since the 2026-10-17 audit

The former baseline was **29 entries (19 high, 10 moderate, 0 critical)**. After updating to the latest Expo SDK 57-compatible patch set, it is **6 (3 high, 3 moderate, 0 critical)**.

- `node-forge` resolved to `1.4.1`, above the affected version bound stated in [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv); no longer flagged by the latest npm audit.
- `xcode@4.0.0` no longer brings `uuid@7` into the mobile lockfile.
- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (`braces`) was officially **withdrawn on 2026-10-23** because the reported issue was not practically exploitable. Its withdrawal, not a fabricated package patch, explains why it no longer appears.
- Historical patches from the 2026-10-09 refresh addressed `shell-quote`, `brace-expansion`, `compression`, and `source-map-js`.

## CI policy and release disposition

The Mobile CI job runs:
1. `npm ci`;
2. `npm audit --omit=dev --audit-level=critical` **blocking**;
3. `npm audit --omit=dev --audit-level=high` **visible but non-blocking** (`continue-on-error: true`);
4. `npx expo install --check`, TypeScript/i18n/tests and Android/iOS bundle exports.

`Security` additionally runs secret scanning and **CodeQL for C# and JavaScript/TypeScript** on pull requests. A green workflow should not be presented as zero Mobile high/moderate findings.

**Disposition: OPEN — 2 upstream advisory roots / 6 propagated entries.** There is no automatic acceptance of the residual risk. Do not run `npm audit fix --force` or downgrade Expo to silence an audit; compatible upstream fixes or a regression-tested narrow backport are preferred. Confirm whether vulnerable paths execute in *shipped signed mobile builds* (as opposed to the Expo CLI build tool) before a production risk decision.

- **Next reassessment:** 2026-11-03, and whenever a relevant Expo, Expo Router, Zod or `query-string` patch ships.
- **Decision owner:** release owner, after documenting threat reachability, mitigating controls, expiration date and the exact candidate SHA.
- **External acceptance:** production HTTPS, PayPal Live, monitoring, off-host backups, signed-device OAuth/push and store/legal review are not proved by CI and remain in [release issue #128](https://github.com/Jairo0811/BarberTrix/issues/128).

See [test matrix](test-matrix.md), [mobile release](mobile-release.md), and [release candidate](release-candidate.md).
