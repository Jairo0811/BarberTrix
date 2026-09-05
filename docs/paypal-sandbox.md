# PayPal Sandbox for BarberTrix

BarberTrix can initialize its PayPal subscription catalog without relying on the PayPal Developer Dashboard UI.

This is useful when `developer.paypal.com/dashboard` returns `unauthorized` but PayPal Business onboarding already exposed valid Sandbox API credentials.

## What BarberTrix needs

BarberTrix billing uses PayPal Subscriptions and expects:

- one PayPal product: `BarberTrix`
- one monthly `BarberTrix Pro` plan at `US$40.00`
- one monthly `BarberTrix Business` plan at `US$70.00`
- a webhook pointing to `/api/webhooks/paypal`

The backend already validates PayPal webhook signatures and handles these subscription events:

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`

## Security rules

Never commit or paste a PayPal Client Secret into source control, documentation, issues, pull requests or chat transcripts.

The bootstrap script prompts for the Sandbox Client Secret as a `SecureString`. The secret is used only to obtain an OAuth access token and is not written to disk by the script.

Use Sandbox credentials only with `https://api-m.sandbox.paypal.com`. Use Live credentials only with `https://api-m.paypal.com`.

## Bootstrap the Sandbox product and plans

From the repository root in PowerShell:

```powershell
$env:PAYPAL_CLIENT_ID = "YOUR_SANDBOX_CLIENT_ID"
./scripts/paypal/Initialize-BarberTrixPayPalSandbox.ps1
```

The script will securely prompt for the Sandbox Client Secret.

It then:

1. obtains an OAuth 2.0 access token;
2. reuses or creates the `BarberTrix` product;
3. reuses or creates the active `BarberTrix Pro` monthly plan;
4. reuses or creates the active `BarberTrix Business` monthly plan;
5. prints the generated plan IDs without printing the secret.

The script is safe to rerun: it looks for existing product/plan resources before creating replacements.

## Configure the webhook later

PayPal requires a publicly reachable HTTPS endpoint for webhooks. Once the BarberTrix staging API has a public URL, rerun:

```powershell
$env:PAYPAL_CLIENT_ID = "YOUR_SANDBOX_CLIENT_ID"
./scripts/paypal/Initialize-BarberTrixPayPalSandbox.ps1 -ApiBaseUrl "https://api-staging.example.com"
```

The resulting webhook URL is:

```text
https://api-staging.example.com/api/webhooks/paypal
```

The script reuses the webhook if the exact URL is already registered.

## Local BarberTrix configuration

Copy the generated IDs into the local `.env` file together with the Sandbox credentials that PayPal gave you:

```dotenv
BARBERTRIX_FRONTEND_ORIGIN=http://localhost:5173
BARBERTRIX_PAYPAL_CLIENT_ID=your-sandbox-client-id
BARBERTRIX_PAYPAL_SECRET=your-sandbox-client-secret
BARBERTRIX_PAYPAL_WEBHOOK_ID=your-sandbox-webhook-id
BARBERTRIX_PAYPAL_PRO_PLAN_ID=P-...
BARBERTRIX_PAYPAL_BUSINESS_PLAN_ID=P-...
```

Do not commit `.env`.

`BARBERTRIX_FRONTEND_ORIGIN` must match the origin that starts the checkout because BarberTrix validates PayPal return and cancel URLs before creating a subscription. The default local Vite origin is `http://localhost:5173`. If you intentionally test the containerized web app at `http://localhost:8081`, set `BARBERTRIX_FRONTEND_ORIGIN=http://localhost:8081` and recreate the API container.

The development Docker Compose configuration runs PayPal in Sandbox mode. Production explicitly runs PayPal in Live mode.

## Diagnosing `unauthorized`

The PayPal Developer Dashboard returning the literal page `unauthorized` is separate from BarberTrix API authentication.

Run the bootstrap script to test the API credentials directly:

- If OAuth token acquisition succeeds, the Sandbox API credentials are valid even if the dashboard UI is inaccessible.
- If OAuth fails, verify that the Client ID and Client Secret are from the same Sandbox credential set.
- If OAuth succeeds but product/plan creation returns `403`, the PayPal account or application lacks the required subscription permissions and PayPal support should review the account.

## Diagnosing checkout errors

If the web app reports that PayPal could not be started, verify the backend origin first:

```powershell
docker compose exec api printenv PasswordReset__FrontendBaseUrl
```

When using Vite, it should print:

```text
http://localhost:5173
```

After changing `.env` or `docker-compose.yml`, recreate the API container so environment variables are reloaded:

```powershell
docker compose up -d --force-recreate api
```

The web billing dialog surfaces the backend billing detail and correlation ID when available, making configuration failures distinguishable from PayPal API failures.

Do not switch BarberTrix to Live until Sandbox checkout, approval, capture and signed webhook processing have all been validated end to end.
