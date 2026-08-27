# BarberTurn Mobile

Aplicación móvil React Native + Expo de BarberTurn.

## Alcance de esta base

- Expo Router y TypeScript estricto.
- TanStack Query.
- cliente HTTP compartido y contrato de errores.
- pantalla inicial de autenticación.
- `expo-secure-store` preparado para refresh tokens de sesiones móviles.
- deep-link scheme `barberturn://`.
- dependencia SignalR preparada para cola/turnos en tiempo real.

## Desarrollo

1. Copia `.env.example` a `.env`.
2. Configura `EXPO_PUBLIC_API_BASE_URL` con una URL accesible desde el dispositivo/emulador.
3. Ejecuta `npm install` y `npm run start`.

> La API web actual mantiene el refresh token en cookie HttpOnly. El siguiente paso de M1 es añadir un contrato de sesión móvil explícito con refresh token rotatorio almacenado únicamente en Keychain/Keystore mediante SecureStore; no debe persistirse en AsyncStorage.

## Próximo módulo

`TurnRequest`: solicitud dirigida cliente → barbero, aceptación/rechazo/contraoferta y notificaciones push.
