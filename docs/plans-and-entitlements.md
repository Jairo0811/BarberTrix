# BarberTrix plans and entitlements

This document is the commercial source of truth for plan behavior. Server-side entitlements remain authoritative.

## Principles

- Free is a permanent operating tier, not an expiring trial.
- Customers and independent barber identity/onboarding are not subscription-gated.
- Essential push notifications stay available on Free; paid plans monetize advanced automation, not critical communication.
- Existing turns and data are never deleted because a subscription expires or is cancelled.
- Monthly turn limits gate only creation of new turns after the grace allowance; existing turns can still be viewed, called, completed or cancelled.
- Public QR/link access stays on Free because it is part of BarberTrix's acquisition loop.

## Entitlements

| Entitlement | Free | Starter | Pro | Business |
|---|---:|---:|---:|---:|
| Monthly turns included | 100 | 1,000 | High volume | High volume |
| Hard grace threshold | 110 | 1,050 | Fair use | Fair use |
| Active barbers | 3 | 5 | 10 | Unlimited |
| Active services | 5 | Unlimited | Unlimited | Unlimited |
| Active locations | 1 | 1 | 1 | 3 |
| Queue history | 7 days | 90 days | Full | Full |
| Essential push notifications | Yes | Yes | Yes | Yes |
| Appointments | No | No | Yes | Yes |
| BarberTrix TV | No | No | Yes | Yes |
| Advanced automation | No | No | Yes | Yes |
| Advanced reports | No | No | No | Yes |

## Downgrade behavior

When a paid subscription is cancelled, suspended or becomes past due, the effective tenant plan falls back to Free. Paid subscription records remain available for billing history, but BarberTrix keeps the tenant operational under Free limits.

If current usage is above a Free resource limit, existing records remain intact. Limits are enforced when creating additional resources. This avoids destructive downgrades.

## Notifications

Essential notifications are part of the safe baseline and are never paywalled. Examples include turn state changes, "your turn is approaching", cancellation, onboarding approval and security/account events.

Advanced scheduled reminders, multi-step appointment automation, no-show workflows and future campaigns belong to Pro/Business.
