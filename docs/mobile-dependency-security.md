# Mobile dependency security posture

## Current baseline

The mobile client targets Expo SDK 57 and keeps Expo-managed packages aligned with `npx expo install --check`.

CI treats Expo dependency alignment as a blocking gate and validates the mobile client with:

- `npm ci`
- `npm audit --omit=dev --audit-level=high`
- `npx expo install --check`
- `npm run typecheck`
- Android export/bundle

## Known moderate advisories

As of 2026-09-02, `npm audit` reports 13 moderate findings originating from two transitive Expo dependency chains:

1. `decode-uri-component` through `query-string` and `expo-router` (`GHSA-vcc3-ghjq-m6fr`).
2. `uuid@7` through `xcode` and Expo configuration/CLI packages (`GHSA-w5hq-g745-h8pq`).

These are not 13 independent direct application dependencies.

## Why `npm audit fix --force` is prohibited

The current npm remediation proposes breaking downgrades such as `expo-router@5.1.11` and `expo@46.0.21`. Those versions are incompatible with the current Expo 57 application stack and would introduce a much larger regression/security risk.

Do not run `npm audit fix --force` on the mobile project as a routine remediation step.

## Accepted temporary posture

- High and critical production dependency findings remain blocking in CI.
- Moderate findings are tracked but do not bypass Expo compatibility constraints.
- Expo patch releases are kept aligned and should be adopted promptly.
- Re-evaluate the two advisory chains whenever Expo, Expo Router, config plugins, or their transitive dependencies release compatible fixes.

This is a temporary upstream-risk acceptance, not a declaration that the advisories are irrelevant.
