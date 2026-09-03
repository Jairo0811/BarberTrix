# BarberTrix plans and entitlements

This document is the commercial source of truth for plan behavior. Server-side entitlements remain authoritative.

## Principles

- BarberTrix exposes exactly three commercial plans: Free, Pro and Business.
- Free is a permanent operating tier, not an expiring trial.
- Customers and independent barber identity/onboarding are not subscription-gated.
- Appointments and essential push notifications stay available on Free; paid plans monetize scale, BarberTrix TV, advanced automation and enterprise capabilities rather than baseline operations or critical communication.
- Existing turns and data are never deleted because a subscription expires or is cancelled.
- Monthly turn limits gate only creation of new turns after the grace allowance; existing turns can still be viewed, called, completed or cancelled.
- Public QR/link access stays on Free because it is part of BarberTrix's acquisition loop.
- The historical `Starter = 1` enum/database value is retained only for backward compatibility. It is normalized to Free and cannot be purchased through new checkouts.

## Entitlements

| Entitlement | Free | Pro | Business |
|---|---:|---:|---:|
| Monthly turns included | 1,000 | High volume | High volume |
| Hard grace threshold | 1,050 | Fair use | Fair use |
| Active barbers | 3 | 10 | Unlimited |
| Active services | Unlimited | Unlimited | Unlimited |
| Active locations | 1 | 1 | 3 |
| Queue history | 1 calendar-length month (28/29/30/31 days) | Full | Full |
| Essential push notifications | Yes | Yes | Yes |
| Appointments | Yes | Yes | Yes |
| BarberTrix TV | No | Yes | Yes |
| Advanced automation | No | Yes | Yes |
| Advanced reports | No | No | Yes |

### Free history retention

Free history uses the number of days in the barbershop's current local calendar month. That means the retention window is 28 or 29 days in February, 30 days in a 30-day month and 31 days in a 31-day month. The shop timezone remains authoritative.

## Downgrade behavior

When a paid subscription is cancelled, suspended or becomes past due, the effective tenant plan falls back to Free. Paid subscription records remain available for billing history, but BarberTrix keeps the tenant operational under Free limits.

If current usage is above a Free resource limit, existing records remain intact. Limits are enforced when creating additional resources. This avoids destructive downgrades.

## Notifications and appointments

Essential notifications are part of the safe baseline and are never paywalled. Examples include turn state changes, "your turn is approaching", cancellation, onboarding approval and security/account events.

Appointments are also a baseline capability in the three-plan model. Free barbershops can publish availability and accept bookings; Pro and Business differentiate through scale and advanced automation rather than by disabling appointment access.

Advanced scheduled reminders, multi-step appointment automation, no-show workflows and future campaigns belong to Pro/Business.
