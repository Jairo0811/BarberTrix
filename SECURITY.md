# Seguridad

## Versiones soportadas

Se admite la rama `main` y la versión publicada más reciente.

## Reportar una vulnerabilidad

No publiques vulnerabilidades como issues. Repórtalas de forma privada mediante **Security → Advisories → Report a vulnerability** en GitHub. Incluye el componente, impacto, pasos de reproducción y una prueba de concepto sin datos reales.

Se intentará confirmar la recepción en 72 horas y compartir una evaluación inicial en siete días. No accedas a datos ajenos, no interrumpas el servicio y no realices ingeniería social.

## Controles relevantes

- access tokens cortos y refresh tokens rotatorios/revocables en cookie `HttpOnly`, `Secure` bajo HTTPS y `SameSite=Lax`;
- aislamiento por `BarberShopId` derivado del JWT y pruebas multi-tenant;
- verificación de correo, roles y security stamp;
- rate limiting, auditoría, correlation ID y encabezados de seguridad;
- separación SignalR por audiencias `internal`, `public` y `tv`;
- errores API estructurados mediante `code`, `message` y `correlationId`;
- secretos por variables de entorno;
- identidad SQL de aplicación separada de la identidad de migraciones y del administrador de la instancia;
- logs estructurados sin passwords, JWT, refresh tokens, cookies ni secretos de proveedores;
- CodeQL, Dependabot, escaneo de secretos y gates de cobertura en CI.

## Producción

La API no debe ejecutarse con credenciales SQL administrativas. Consulta [`docs/production-operations.md`](docs/production-operations.md) para la estrategia de mínimo privilegio, migraciones, observabilidad, backups, secretos y checklist de lanzamiento.
