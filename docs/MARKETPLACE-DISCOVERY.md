# BarberTrix Marketplace / Discovery

## Publication lifecycle

A barbershop is private by default. Creating a BarberTrix tenant does not automatically expose the business in customer discovery.

Only an authenticated `Owner` can manage the marketplace profile and publish or unpublish it.

### Minimum publication requirements

- active barbershop;
- at least one active location with an address;
- at least one active service;
- at least one active barber;
- at least one customer entry mode enabled: walk-in/turn now or appointment.

The API returns `publicationIssues` so the professional UI can present a checklist instead of failing silently.

### Owner API

- `GET /api/shop/public-profile`
- `PUT /api/shop/public-profile`
- `PUT /api/shop/public-profile/publication`

The public profile stores description, public phone, WhatsApp, logo/cover URLs, booking modes and publication state.

### Customer discovery

`GET /api/public/discovery/shops` returns only explicitly published businesses. Discovery enriches them with live BarberTrix operational data such as queue size, available barbers, starting price and estimated wait.

This keeps the marketplace opt-in and makes BarberTrix discovery operationally useful rather than a static business directory.
