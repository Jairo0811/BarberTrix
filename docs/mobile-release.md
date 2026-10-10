# Mobile release configuration

Status: **EAS project association is configured and validated by repository configuration.** Store submission, production push credentials and physical-device acceptance remain external release gates.

Expo SDK 57 and the existing package/bundle identifiers are retained.

## EAS association

BarberTrix is linked to the EAS project declared in `mobile/app.json`:

- owner: `jairomatias0811`;
- EAS project ID: `83dd3aa4-69f4-4339-9891-cc40353cb3aa`;
- iOS bundle identifier: `com.jmsoftwaresolutions.barbertrix`;
- Android package: `com.jmsoftwaresolutions.barbertrix`.

`app.config.ts` accepts the checked-in project association and optional environment overrides. During an EAS build it fails fast when no valid non-placeholder project ID is available. A project ID is a public association identifier, not a secret; access tokens and signing credentials must remain outside the repository.

From an authenticated maintainer machine in `mobile`:

1. Run `npx eas-cli@latest login`, then `npx eas-cli@latest whoami`.
2. Run `npx eas-cli@latest project:info` and verify that the returned project is the same BarberTrix project declared above. Do not create a duplicate EAS project.
3. Run `npx expo config --type public` and verify owner, bundle/package identifiers and project association.
4. Configure `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WEB_URL` per environment. Preview must target staging HTTPS, not production.
5. Keep EAS access tokens, Apple/Google signing material and push credentials in the appropriate secret/credential store, never in source control.

`eas.json` defines development, preview and production profiles. Production uses remote versioning and auto-increment. The marketing version remains `0.3.0` until Mobile v1 acceptance is completed. Native initial buildNumber/versionCode is 1; EAS owns subsequent increments.

## Build acceptance

Repository CI already proves that the current Mobile source can:

- align Expo dependencies with `expo install --check`;
- typecheck;
- pass i18n and Mobile reliability tests;
- export/bundle Android;
- export/bundle iOS.

These gates prove source/build health. They do **not** prove Apple/Google signing, APNs/FCM delivery, physical-device behavior or store acceptance.

## Store checklist (not yet certified complete)

- Verify Apple developer team, App Store Connect record, bundle ID, provisioning and APNs key. Store credentials outside the repository.
- Verify Google Play application, Android signing key ownership/backups and FCM v1 service credentials in EAS.
- Prepare and visually review icon, Android adaptive foreground/background, splash and monochrome notification asset from the existing BarberTrix brand; do not treat the large runtime logo as approved store artwork.
- Review photo/location permission descriptions, privacy manifest/SDK declarations, encryption declaration and App Store privacy/Google Data Safety forms against actual behavior.
- Verify `barbertrix://` links on installed builds for OAuth and request status. HTTPS Universal/App Links require an owned domain plus Apple association/Android assetlinks files and signed build IDs; do not claim ownership of an unconfigured domain.
- Test launch, upgrade, reinstall, session restoration, denied/granted push, foreground/background/killed delivery and notification navigation.
- Verify the in-app account-deletion flow on signed builds and confirm that the previous session cannot be reused.
- Verify `/account-deletion.html`, Privacy, Terms and support URLs as public HTTPS resources before submission.
- Screenshots and store metadata must be reviewed against the actual production candidate.

See [realtime](realtime.md), [dependency security](mobile-dependency-security.md), [test matrix](test-matrix.md), [account deletion](account-deletion.md) and [release candidate](release-candidate.md).

EAS project linking is complete at repository level. Signing credentials, APNs/FCM, physical-device acceptance and store review remain external release gates.
