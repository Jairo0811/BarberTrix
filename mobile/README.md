# BarberTurn Mobile

Aplicación móvil nativa multiplataforma de BarberTurn construida con React Native + Expo.

## Alcance actual — M0 + M1 + M2

- Expo SDK 57, React Native 0.86 y TypeScript estricto.
- Expo Router para navegación basada en archivos.
- TanStack Query para estado remoto.
- SignalR para actualizar solicitudes mientras la app está abierta.
- autenticación móvil separada del contrato web;
- access token únicamente en memoria;
- refresh token rotatorio persistido exclusivamente con Expo SecureStore (Keychain/Keystore);
- restauración automática de sesión y logout con revocación del refresh token;
- deep-link scheme `barberturn://`;
- interfaz light-only coherente con la web.

### M2 — TurnRequest

M2 separa una **solicitud** de una **cita confirmada**. Un cliente anónimo puede abrir `barberturn://request/{slug}`, elegir servicio, un barbero específico y un horario disponible, y enviar la solicitud sin crear una cuenta.

El ciclo de estados es:

`Pending → Accepted | Rejected | CounterProposed → Accepted | Cancelled | Expired`

Cuando el personal acepta una solicitud —o el cliente acepta una contraoferta— el backend crea el `Appointment` de forma transaccional y vuelve a comprobar la disponibilidad de la agenda para evitar dobles reservas.

El token opaco que permite al cliente consultar/cancelar su solicitud se almacena mediante SecureStore y no se coloca en AsyncStorage ni en parámetros de navegación. Al convertirse en cita, la misma capacidad segura permite consultar la cita confirmada.

La bandeja autenticada `/(app)/turn-requests` permite aceptar, rechazar o contraofertar. Los usuarios con rol Barber solo pueden operar solicitudes dirigidas a su propio `BarberId`.

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

Nunca persistir access tokens, refresh tokens o capability tokens en AsyncStorage.

## Realtime y siguiente módulo

M2 usa SignalR para refrescar la bandeja del personal mientras BarberTurn Mobile está abierta, con polling de respaldo. **Esto no sustituye las notificaciones push del sistema operativo.**

M3 añadirá registro de dispositivos y push notifications para avisar al barbero cuando llegue una solicitud con la app en segundo plano/cerrada, y al cliente cuando la solicitud sea aceptada, rechazada o reciba una contraoferta.
