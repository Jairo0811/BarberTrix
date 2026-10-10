# BarberTrix account deletion lifecycle

BarberTrix provides account deletion from the authenticated mobile Settings screen and from the public Web resource `/#/account-deletion`.

## User experience

- Mobile: **Settings → Delete account** presents the consequences and requires a second destructive confirmation.
- Web: `/#/account-deletion` is publicly readable so it can be supplied to Google Play as the account-deletion resource. An authenticated user can complete deletion from that page.
- The API requires an authenticated session and the explicit confirmation value `DELETE` before processing `DELETE /api/account`.
- A successful deletion removes active refresh sessions, so the deleted identity cannot restore an old session.

## Data lifecycle

Account deletion is not implemented as an unsafe cascade delete. BarberTrix separates personal identity from operational records that can require retention for accounting, security, dispute resolution, or the barbershop's legitimate operational history.

For every deleted identity BarberTrix:

- replaces the user's name and email with non-personal deletion placeholders;
- invalidates the password and security stamp;
- disables the identity;
- removes email-verification tokens and refresh sessions;
- removes device push subscriptions and their pending delivery records;
- removes the personal barber profile when one exists;
- revokes shop memberships.

Operational records that must remain structurally valid are retained without the deleted user's active identity. Actual legal retention periods must be defined in the final privacy policy for the operator's jurisdiction.

## Owner/workspace deletion

Deleting an Owner account is also a workspace-closure operation because a tenant cannot remain commercially active without its accountable Owner.

The lifecycle is:

1. Read the current subscription.
2. If a paid subscription is active, cancel it immediately with the billing provider. If provider cancellation fails, account deletion stops instead of locking the customer out while billing continues.
3. Mark the barbershop inactive.
4. Revoke team memberships and deactivate tenant identities.
5. Deactivate operational barbers and revoke TV display credentials.
6. Remove pending team invitations, join requests, sessions, push registrations, and personal profiles.
7. Anonymize the Owner identity.

Business transactions and other records subject to retention are not silently destroyed by this path.

## External identity providers

Google/Apple sign-in accounts use the same BarberTrix deletion lifecycle. The current social-auth implementation does not persist provider refresh tokens, so BarberTrix cannot retroactively revoke an Apple authorization token that it never retained. BarberTrix data deletion still completes; legacy Apple users may additionally revoke BarberTrix from their Apple account settings.

Before a future change persists provider revocation credentials, it must include encrypted-at-rest secret handling and a migration/rotation strategy. Provider refresh tokens must never be stored as plaintext application data or logged.

## Store-release acceptance

Before store submission, verify on installed production-signed builds that:

- the Settings deletion control is reachable for every account type;
- deletion completes after re-authenticated/valid sessions;
- deleted sessions cannot be restored;
- paid Owner deletion cancels the real provider subscription;
- the public account-deletion URL is deployed over HTTPS and remains reachable without authentication;
- the privacy policy describes the same deletion and retention behavior.
