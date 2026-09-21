# PayPal subscriptions for BarberTrix

BarberTrix uses the PayPal Subscriptions REST API for the paid SaaS plans.

## Commercial catalog

The bootstrap script manages exactly these PayPal resources:

- product: `BarberTrix`
- monthly plan: `BarberTrix Pro` — US$40.00
- monthly plan: `BarberTrix Business` — US$70.00
- optional webhook: `/api/webhooks/paypal`

The backend validates PayPal webhook signatures and handles:

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`

## Security

Never commit or paste a PayPal Client Secret into source control, documentation, issues, pull requests, chat transcripts, screenshots, or shell history.

The bootstrap script prompts for the Client Secret as a PowerShell `SecureString`. The secret is used only to obtain an OAuth access token and is not written to disk by the script.

Use Sandbox credentials only with `https://api-m.sandbox.paypal.com` and Live credentials only with `https://api-m.paypal.com`.

## Bootstrap Sandbox

From the repository root:

```powershell
$env:PAYPAL_CLIENT_ID = "YOUR_SANDBOX_CLIENT_ID"
./scripts/paypal/Initialize-BarberTrixPayPal.ps1 -Environment Sandbox
```

The compatibility wrapper still works:

```powershell
./scripts/paypal/Initialize-BarberTrixPayPalSandbox.ps1
```

## Bootstrap Live

Before running Live, verify in the PayPal Developer Dashboard that the BarberTrix REST app belongs to the intended Business account and that **Subscriptions** is enabled.

Then run:

```powershell
$env:PAYPAL_CLIENT_ID = "YOUR_LIVE_CLIENT_ID"
./scripts/paypal/Initialize-BarberTrixPayPal.ps1 -Environment Live
```

The script requires typing `LIVE` before it can create or reuse real Live catalog resources.

It then:

1. authenticates against the selected PayPal environment;
2. reuses or creates the `BarberTrix` product;
3. reuses or creates `BarberTrix Pro` at US$40/month;
4. reuses or creates `BarberTrix Business` at US$70/month;
5. validates an existing active plan before reusing it, refusing to silently accept a wrong price, currency, product, or billing interval;
6. prints the product and plan IDs without printing the Client Secret.

The script is designed to be rerunnable.

## Webhook

PayPal requires a publicly reachable HTTPS endpoint. Do not use localhost.

When the production or staging API has a public HTTPS origin, rerun with:

```powershell
$env:PAYPAL_CLIENT_ID = "YOUR_LIVE_CLIENT_ID"
./scripts/paypal/Initialize-BarberTrixPayPal.ps1 -Environment Live -ApiBaseUrl "https://api.example.com"
```

The registered URL will be:

```text
https://api.example.com/api/webhooks/paypal
```

The script reuses a webhook if the exact URL is already registered.

## BarberTrix environment variables

Production expects:

```dotenv
BARBERTRIX_PAYPAL_CLIENT_ID=your-live-client-id
BARBERTRIX_PAYPAL_SECRET=your-live-client-secret
BARBERTRIX_PAYPAL_WEBHOOK_ID=your-live-webhook-id
BARBERTRIX_PAYPAL_PRO_PLAN_ID=P-...
BARBERTRIX_PAYPAL_BUSINESS_PLAN_ID=P-...
```

Do not commit a real `.env` file or any secret-manager export.

`docker-compose.production.yml` already sets `PayPal__Sandbox=false`, so production uses `https://api-m.paypal.com`. Development remains in Sandbox mode.

## Release gate

Creating the Live product and plans does not by itself make BarberTrix production-ready. Before taking real customer subscriptions, also validate:

- public HTTPS deployment;
- Live return/cancel URLs;
- signed Live webhook delivery;
- one controlled Live checkout and cancellation;
- correct Pro/Business entitlements;
- production logging/alerts without secrets or payment data;
- legal/privacy and customer-support flows.
