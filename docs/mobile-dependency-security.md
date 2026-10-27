# Mobile dependency security posture

## Current baseline

The mobile client targets Expo SDK 57 and React Native 0.86.3. Expo-managed packages are kept aligned with `npx expo install --check`.

As of 2026-10-27, dependency alignment was verified for the PR #126 Expo SDK 57 baseline (updated on 2026-10-17). Relevant direct versions include:

- `expo ~57.0.30`, `expo-router ~57.0.28`;
- `expo-crypto ~57.0.4`, `expo-dev-client ~57.0.20`;
- `expo-linking ~57.0.13`, `expo-location ~57.0.21`;
- `expo-notifications ~57.0.23`, `expo-secure-store ~57.0.4`;
- `expo-image-manipulator ~57.0.21`, `expo-image-picker ~57.0.20`.

The CI `npx expo install --check`, typecheck, tests and Android/iOS bundle exports pass on this baseline.

CI validates the mobile client with:

- `npm ci`;
- `npm audit --omit=dev --audit-level=critical` as a blocking gate;
- `npm audit --omit=dev --audit-level=high` as a non-blocking report while the remaining high findings require incompatible upstream changes;
- `npx expo install --check`;
- TypeScript typecheck;
- mobile i18n parity checks;
- mobile reliability tests;
- Android and iOS exports.

## Remediated advisories

The 2026-10-09 dependency refresh removed the previously blocking critical advisory in `shell-quote` and applied the available non-breaking fixes for the other independently remediable packages discovered by npm audit:

- `shell-quote` -> 1.12.0;
- `brace-expansion` -> 5.0.12;
- `compression` -> 1.8.2;
- `source-map-js` -> 1.2.2.

After those fixes, `npm audit --omit=dev` reports **0 critical**, **19 high**, and **10 moderate** findings.

## Remaining upstream advisory chains

The remaining findings originate from four advisory roots in Expo/Metro configuration and tooling dependency chains. They are not 29 independent direct application dependencies.

1. `braces` — high — through `micromatch`, Metro, React Native and Expo tooling (`GHSA-vfj7-8cjw-p6xm`).
2. `node-forge` — high — through `@expo/code-signing-certificates` / Expo CLI (`GHSA-86w9-cpqp-85rv`).
3. `decode-uri-component` — moderate — through `query-string` and `expo-router` (`GHSA-vcc3-ghjq-m6fr`).
4. `uuid@7` — moderate — through `xcode` and Expo configuration plugins (`GHSA-w5hq-g745-h8pq`).

At this baseline npm only proposes remediation for these chains through `npm audit fix --force`, including incompatible framework changes such as downgrading Expo to 44.x or moving Expo Router to an incompatible major line.

## Why `npm audit fix --force` is prohibited

`npm audit fix --force` is not an acceptable routine remediation for this application because npm's proposed fixes cross Expo compatibility boundaries. Forcing those changes would trade known transitive tooling advisories for a broken or unsupported Expo/React Native dependency graph.

Do not downgrade Expo or force an incompatible Expo Router major solely to make the audit count reach zero.

## Temporary upstream-risk posture

- Critical production dependency findings remain blocking in CI.
- High findings remain visible on every CI run and must be remediated when Expo-compatible fixes become available.
- Expo dependency alignment remains blocking.
- Compatible patch-level fixes must be adopted promptly.
- Re-evaluate these advisory chains whenever Expo, Expo Router, Metro, React Native, config plugins or their transitive dependencies release compatible fixes.

This is a documented temporary upstream-risk acceptance, not a declaration that the advisories are irrelevant.

## Reassessment — 2026-10-27 (PR #126)

**Observed dependency-audit outcome:** `npm audit --omit=dev` reports 29 affected package entries: **19 high, 10 moderate, 0 critical**. This is an upstream transitive-dependency issue; counting every propagated audit entry as a distinct vulnerability would overstate the number of independent root advisories.

| Root and installed version | Advisory | Introduced through | Available remedy / scope |
|---|---|---|---|
| `braces@3.0.3` | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (high) | `micromatch -> metro-file-map -> Metro/Expo` | No patched upstream release confirmed 2026-10-27; nested glob patterns can exhaust the Node.js process. Metro/build-tool input exposure must be assessed. |
| `node-forge@1.4.0` | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (high) | `@expo/code-signing-certificates -> Expo CLI` | No patched upstream release listed 2026-10-27. Review signing/certificate-verification trust boundaries in build tooling; do not infer runtime exploitability. |
| `decode-uri-component@0.2.2` | [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) (moderate) | `query-string@7.1.3 -> expo-router@57.0.28` | `decode-uri-component@0.5.0` is patched, but forcing a transitive major outside `query-string@7`'s declared range requires regression tests for URL handling and deep links. Potential runtime exposure merits special attention. |
| `uuid@7.0.3` | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) (moderate) | `xcode@3.0.1 -> @expo/config-plugins` | `uuid >=11.1.1` addresses the advisory, but the `xcode` dependency declares `^7.0.3`; replacing it blindly risks native project generation. |

**Security controls confirmed in PR #126:** backend, frontend, Mobile, Playwright, full-stack E2E, restore rehearsal, Compose and container image builds passed. The `Security` workflow's secret scan passed, but its CodeQL jobs were *skipped* under the previous opt-in setting; the PR now explicitly enables CodeQL and its new results must be reviewed. A green high-audit reporting step is *not* a clean report because that step intentionally uses `continue-on-error: true`.

**Disposition:** **open security debt, not remediated**. Do not use `npm audit fix --force`, Expo downgrades, arbitrary dependency overrides, or version-only allowlisting to make npm audit report zero. Prefer compatible upstream updates or an independently tested, narrowly scoped fix. Review advisories and the shipped Android/iOS bundle's actual reachable code paths before approving a commercial release. Keep critical findings blocking and high findings visible; a release owner must explicitly document any residual high-risk acceptance, its expiry and compensating controls.

**Next review:** 2026-11-03, or sooner if Expo / Metro / node-forge / braces / query-string / xcode publish relevant updates. Re-run the complete mobile CI suite and native signed-build smoke tests after a dependency change.

This reassessment **does not** attest live PayPal, physical-device push/OAuth, production secrets, live monitoring, legal clearance or store approval. Those are separate external acceptance gates in [release-candidate.md](release-candidate.md).
