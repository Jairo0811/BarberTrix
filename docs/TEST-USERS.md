# BarberTrix test users

The development/system-admin seeder creates role-specific accounts whenever `SystemAdmin:Enabled` or the legacy `DemoAdmin:Enabled` flag is enabled.

All seeded role-test accounts intentionally use the same configured administrator seed password (`SystemAdmin:Password`, falling back to `DemoAdmin:Password`). No password is committed to the repository.

| Scenario | Email | Role / behavior |
| --- | --- | --- |
| System administrator | `admin@barbertrix.com.do` | Administrator on the BarberTrix administration tenant; canonical replacement for `admin@barbertrix.com.do`. The seeder migrates the legacy email automatically. |
| Employee barber | `barbero@barbertrix.com.do` | Barber linked to an operational barber/chair inside the administration tenant. Useful for validating barber-only permissions and queue operations. |
| Owner who also cuts hair | `dueno.barbero@barbertrix.com.do` | Owner of `BarberTrix Owner Lab` (Pro) with an operational barber profile. Useful for validating owner controls plus day-to-day barber behavior. |
| Customer | `cliente@barbertrix.com.do` | Client identity without tenant access. BarberTrix Mobile routes this account directly to Discovery instead of professional onboarding. |

## Team linkage scenarios

BarberTrix supports both directions:

1. An independent barber registers, searches for a barber shop and submits a join request. Owner/Administrator approves or rejects the request and assigns a chair.
2. Owner/Administrator opens Team Management and creates an invitation for an Administrator, Receptionist or Barber. A barber invitation is linked to an operational barber/chair.

The mobile Team Management center exposes invitations, pending barber join requests, approvals/rejections and member deactivation while preserving the existing backend authorization rules.
