# Seguridad

## Versiones soportadas

Se admite la rama `main` y la versión publicada más reciente.

## Reportar una vulnerabilidad

No publiques vulnerabilidades como issues. Repórtalas de forma privada mediante **Security → Advisories → Report a vulnerability** en GitHub. Incluye el componente, impacto, pasos de reproducción y una prueba de concepto sin datos reales.

Se intentará confirmar la recepción en 72 horas y compartir una evaluación inicial en siete días. No accedas a datos ajenos, no interrumpas el servicio y no realices ingeniería social.

## Controles relevantes

- tokens de acceso cortos y refresh tokens rotatorios/revocables;
- aislamiento por `BarberShopId` derivado del JWT;
- verificación de correo, roles y security stamp;
- rate limiting, auditoría y encabezados de seguridad;
- secretos por variables de entorno;
- CodeQL, Dependabot y escaneo de secretos en CI.
