# Google and Apple sign-in

BarberTrix supports email/password plus Google and Apple for customer accounts on web and mobile. The backend owns the OAuth code exchange and validates each provider token before issuing a BarberTrix session.

## Required configuration

```dotenv
BARBERTRIX_EXTERNAL_AUTH_PUBLIC_BASE_URL=https://api.example.com
BARBERTRIX_EXTERNAL_AUTH_WEB_RETURN_URI=https://app.example.com/#/auth-callback
BARBERTRIX_GOOGLE_CLIENT_ID=
BARBERTRIX_GOOGLE_CLIENT_SECRET=
BARBERTRIX_APPLE_CLIENT_ID=
BARBERTRIX_APPLE_TEAM_ID=
BARBERTRIX_APPLE_KEY_ID=
BARBERTRIX_APPLE_PRIVATE_KEY=
```

The Apple private key accepts PEM text with escaped `\n` line breaks. Store every secret in the deployment platform, never in source control.

## Provider callback URLs

Register these exact server callbacks:

- Google: `{PUBLIC_API_URL}/api/auth/mobile/oauth/google/callback`
- Apple: `{PUBLIC_API_URL}/api/auth/mobile/oauth/apple/callback`

Apple must use the configured Services ID and a verified HTTPS domain.

## Security model

- Authorization code flow uses a signed, short-lived state token.
- The browser/mobile client supplies a PKCE challenge and verifies the one-time handoff.
- Provider ID tokens are validated server-side.
- Web refresh tokens are written only to the existing secure HttpOnly cookie.
- Mobile refresh tokens remain in Expo SecureStore.
- New social accounts are created with the `Client` role; social sign-in never grants shop staff privileges.
