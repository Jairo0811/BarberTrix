# Mobile dependency security posture

## Current baseline

The mobile client targets Expo SDK 57 and React Native 0.86.3. Expo-managed packages are kept aligned with `npx expo install --check`.

As of 2026-10-09, the project is aligned with the compatibility versions currently reported by Expo SDK 57, including the latest required patch updates for:

- `expo-crypto ~57.0.3`;
- `expo-dev-client ~57.0.19`;
- `expo-image-manipulator ~57.0.21`;
- `expo-image-picker ~57.0.20`;
- `expo-location ~57.0.20`;
- `expo-notifications ~57.0.22`;
- `expo-secure-store ~57.0.4`.

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
