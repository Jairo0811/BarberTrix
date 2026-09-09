# Mobile release configuration

Status: release configuration in progress; no store submission or physical-device acceptance has been performed by this change. Expo SDK 57 and existing bundle/package IDs are retained.

## EAS linking

No EAS project ID is fabricated. The build accepts the actual UUID using `EXPO_PUBLIC_EAS_PROJECT_ID`; runtime registration also accepts `extra.eas.projectId` or `Constants.easConfig.projectId`.

From an authenticated maintainer machine in `mobile`:

1. Run `npx eas-cli@latest login`, then `npx eas-cli@latest whoami`.
2. Confirm the organization/account that owns BarberTrix. Set `EXPO_ACCOUNT_OWNER` to that account name.
3. Run `npx eas-cli@latest init`. Select the existing BarberTrix project if already created. Do not create a second project for the same app accidentally.
4. Because configuration is dynamic, set the UUID shown by EAS as `EXPO_PUBLIC_EAS_PROJECT_ID` in the local environment and each EAS environment. A project ID is a public identifier, not a credential. Keep access tokens in a secret manager.
5. Run `npx expo config --type public` and `npx eas-cli@latest project:info`; verify owner, package IDs and project association. Do not paste configuration containing unrelated sensitive values into tickets.
6. Configure `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WEB_URL` for each environment. Preview must target staging HTTPS, not production.
7. Run `npx eas-cli@latest build --profile development --platform android`, then preview on both platforms. Development uses `expo-dev-client`; Expo Go is not push acceptance evidence.

`eas.json` defines development, preview and production. Production uses remote versioning and auto-increment. The marketing version remains 0.3.0 until Mobile v1 acceptance is completed. Native initial buildNumber/versionCode is 1; EAS owns subsequent increments. `EAS_BUILD` fails fast if project association is missing.

## Store checklist (not yet certified complete)

- Verify Apple developer team, App Store Connect record, bundle ID, provisioning and APNs key. Store credentials outside the repository.
- Verify Google Play application, Android signing key ownership/backups and FCM v1 service credentials in EAS.
- Prepare and visually review icon, Android adaptive foreground/background, splash and monochrome notification asset from the existing BarberTrix brand; do not treat the large runtime logo as approved store artwork.
- Review photo/location permission descriptions, privacy manifest/SDK declarations, encryption declaration and App Store privacy/Google Data Safety forms against actual behavior.
- Verify `barbertrix://` links on installed builds for OAuth and request status. HTTPS Universal/App Links require an owned domain plus Apple association/Android assetlinks files and signed build IDs; do not claim ownership of an unconfigured domain.
- Test launch, upgrade, reinstall, session restoration, denied/granted push, foreground/background/killed delivery and notification navigation.
- Screenshots, support URL, privacy and terms URLs must be public HTTPS pages with reviewed content.

See [realtime](realtime.md), [dependency security](mobile-dependency-security.md) and [test matrix](test-matrix.md). EAS linking, credentials, assets approval and store review remain external release gates.
