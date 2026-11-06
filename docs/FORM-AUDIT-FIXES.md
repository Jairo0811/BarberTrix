# Auditoría correctiva de formularios — BarberTrix

Este documento registra los cambios propuestos en el PR #132 y las condiciones de
validación previas al lanzamiento. No sustituye pruebas reales de base de datos,
pasarela de pago o dispositivos.

## Configuración obligatoria: Cloudflare Turnstile

- Compilar el frontend con `VITE_TURNSTILE_SITE_KEY` (clave **pública**).
- Cloudflare Pages: establecer `VITE_TURNSTILE_SITE_KEY` en las variables de compilación.
- Docker Compose de producción: definir `BARBERTRIX_TURNSTILE_SITE_KEY`.
- Backend: `HumanVerification__Enabled=true` y `HumanVerification__SecretKey`
  (en Compose: `BARBERTRIX_TURNSTILE_SECRET`). La clave secreta nunca debe
  incluirse en variables `VITE_*` ni en archivos públicos.
- Confirmar que la clave pública autoriza el dominio de despliegue.
- La versión sin clave pública continúa ocultando el widget para entornos de
  desarrollo o tests cuyo backend no exige validación humana.

## Contratos de formularios

- Nuevos barberos invitados deben vincularse a un barbero existente **o**
  proporcionar un número de silla válido, con validación de datos previa al POST.
- Las citas públicas deben validar nombre, correo y demás campos antes del
  POST definitivo, limpiar slots al cambiar servicio/barbero/fecha y mostrar
  los horarios en la zona horaria de la barbería.
- CRM: ignorar respuestas de perfil que no pertenezcan al cliente actualmente
  seleccionado.
- Agenda: ignorar respuestas de disponibilidad anteriores a un cambio de filtros.
- Edición de barberos/servicios mediante formularios con restricciones HTML y
  validación de números; no utilizar `window.prompt()`.

## Despliegue web y autenticación

Con frontend y backend en sitios distintos (por ejemplo, `pages.dev` y
`onrender.com`), las cookies de actualización de sesión con `SameSite=Lax`
no funcionarán en contextos cross-site. Se recomienda frontend/API bajo el
mismo sitio registrable (o una pasarela inversa de mismo origen), sin cambiar
`SameSite` a `None` sin estudiar CSRF y autorización de orígenes.

El despliegue estático de Cloudflare Pages por sí solo **no** aloja la API
ASP.NET Core ni SQL Server.

## Validación antes de fusionar

1. GitHub Actions: CI, Security y Release contract en verde.
2. Playwright: registro, invitación, reservas, cambio de disponibilidad, CRM.
3. xUnit: reglas de cita y autorización por tenant, colisiones y reintentos.
4. Probar registro real contra API con Turnstile configurado.
5. Probar flujo web en Cloudflare, cookies y CORS contra la API publicada.
6. Completar pruebas manuales con lectores de pantalla y móviles.
