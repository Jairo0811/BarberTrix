# BarberTurn Mobile

Aplicación móvil nativa multiplataforma de BarberTurn construida con React Native + Expo.

## Alcance actual — M0 + M1

- Expo SDK 57, React Native 0.86 y TypeScript estricto.
- Expo Router para navegación basada en archivos.
- TanStack Query preparado para datos remotos.
- SignalR preparado para cola y turnos en tiempo real.
- autenticación móvil separada del contrato web;
- access token únicamente en memoria;
- refresh token rotatorio persistido exclusivamente con Expo SecureStore (Keychain/Keystore);
- restauración automática de sesión y logout con revocación del refresh token;
- deep-link scheme `barberturn://`;
- interfaz light-only coherente con la web.

## Desarrollo

1. Usa Node.js 22.13 o superior.
2. Copia `.env.example` a `.env`.
3. Configura `EXPO_PUBLIC_API_BASE_URL` con una URL alcanzable desde el emulador o dispositivo.
4. Ejecuta `npm install`.
5. Ejecuta `npx expo install --fix` para alinear módulos Expo con el SDK antes del primer build local.
6. Ejecuta `npm run start`.

En Android Emulator, una API levantada en el host suele requerir `http://10.0.2.2:8080`; en un dispositivo físico usa la IP LAN del equipo de desarrollo. En producción la API debe exponerse exclusivamente por HTTPS.

## Seguridad de sesión

La web conserva su cookie HttpOnly `barberturn.refresh`. La app móvil utiliza `/api/auth/mobile/login`, `/api/auth/mobile/refresh` y `/api/auth/mobile/logout`. El backend sigue almacenando únicamente el hash del refresh token; el valor bruto solo existe en el dispositivo y rota en cada refresh.

Nunca persistir access tokens ni refresh tokens en AsyncStorage.

## Siguiente módulo — M2

`TurnRequest`: solicitud de turno dirigida cliente → barbero, con estados Pending / Accepted / Rejected / CounterProposed / Cancelled / Expired. Una solicitud aceptada se convierte en una cita confirmada. Después se conectará con notificaciones push.
