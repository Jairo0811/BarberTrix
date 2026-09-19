# PayPal Sandbox for BarberTrix

This document has moved to the shared PayPal guide:

- [PayPal subscriptions for BarberTrix](./paypal.md)

The legacy Sandbox bootstrap command remains supported:

```powershell
./scripts/paypal/Initialize-BarberTrixPayPalSandbox.ps1
```

New work should use the shared script so the target environment is explicit:

```powershell
./scripts/paypal/Initialize-BarberTrixPayPal.ps1 -Environment Sandbox
./scripts/paypal/Initialize-BarberTrixPayPal.ps1 -Environment Live
```

Never commit or share a PayPal Client Secret.
