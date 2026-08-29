# BarberTurn Mobile

Aplicación móvil nativa multiplataforma de BarberTurn construida con React Native + Expo.

## Alcance actual — M0 + M1 + M2 + M3

- Expo SDK 57, React Native 0.86 y TypeScript estricto.
- Expo Router para navegación basada en archivos.
- TanStack Query para estado remoto.
- SignalR para actualizar solicitudes mientras la app está abierta.
- Expo Notifications para avisos del sistema con la app en segundo plano o cerrada.
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

### M3 — Notificaciones push

M3 permite que el personal active avisos de nuevas solicitudes y que el cliente active avisos de aceptación, rechazo o contraoferta. El permiso se solicita únicamente después de una acción explícita del usuario.

Cada instalación recibe un identificador aleatorio guardado en SecureStore. El backend vincula la suscripción a un usuario autenticado o a una solicitud pública validada por su capability token, nunca a ambos. Los payloads enviados a Expo contienen texto genérico sin nombre, teléfono, correo ni notas del cliente.

Las transiciones guardan los avisos en `PushNotificationOutbox` dentro de la misma transacción de negocio. El worker los reclama de forma segura, envía lotes de hasta 100 a Expo, reintenta fallos transitorios y desactiva tokens reportados como `DeviceNotRegistered`. Tocar un aviso solo puede abrir rutas internas allowlisted; el capability token continúa en SecureStore y no viaja en el push.

## Desarrollo

1. Usa Node.js 22.13 o superior.
2. Copia `.env.example` a `.env`.
3. Configura `EXPO_PUBLIC_API_BASE_URL` con una URL alcanzable desde el emulador o dispositivo.
4. Configura `EXPO_PUBLIC_EAS_PROJECT_ID` en desarrollo. En builds EAS se usa primero el `projectId` incorporado por EAS.
5. Ejecuta `npm ci`.
6. Ejecuta `npx expo install --check` para verificar la alineación de los módulos con Expo SDK 57.
7. Ejecuta `npm run typecheck`.
8. Usa un development/release build (`npx expo run:android` o EAS Build) para probar push remoto.

En Android Emulator, una API levantada en el host suele requerir `http://10.0.2.2:8080`; en un dispositivo físico usa la IP LAN del equipo de desarrollo. En producción la API debe exponerse exclusivamente por HTTPS.

`expo-notifications` no ofrece push remoto en Expo Go para Android. También deben configurarse las credenciales FCM v1 y APNs del proyecto EAS antes de una prueba en dispositivos reales.

## Seguridad de sesión

La web conserva su cookie HttpOnly `barberturn.refresh`. La app móvil utiliza `/api/auth/mobile/login`, `/api/auth/mobile/refresh` y `/api/auth/mobile/logout`. El backend sigue almacenando únicamente el hash del refresh token; el valor bruto solo existe en el dispositivo y rota en cada refresh.

Nunca persistir access tokens, refresh tokens o capability tokens en AsyncStorage.

## Realtime y push

SignalR refresca la bandeja mientras BarberTurn Mobile está abierta, con polling de respaldo. M3 complementa ese canal con push del sistema operativo; la API sigue siendo la fuente de verdad al abrir el aviso.

En el backend, `Push__Enabled=true` activa el worker. `Push__AccessToken` es opcional y solo se configura cuando el proyecto Expo usa seguridad reforzada de acceso.
