# BarberTurn — Operación de producción

Esta guía resume los controles operativos mínimos para desplegar BarberTurn como SaaS comercial.

## Base de datos y mínimo privilegio

En `docker-compose.production.yml` SQL Server conserva `sa` únicamente para el bootstrap inicial de la instancia. La aplicación no se conecta con esa cuenta.

Se crean dos identidades separadas:

- `barberturn_migrator`: utilizada exclusivamente por el job de migraciones y miembro de `db_owner` dentro de `BarberTurnDb`.
- `barberturn_app`: utilizada por la API y limitada a `db_datareader` + `db_datawriter`.

Variables requeridas:

```text
BARBERTURN_DB_PASSWORD
BARBERTURN_DB_MIGRATOR_PASSWORD
BARBERTURN_DB_APP_PASSWORD
```

Las tres contraseñas deben ser diferentes, generadas aleatoriamente y almacenadas en un gestor de secretos. No deben versionarse ni reutilizarse entre ambientes.

En infraestructura administrada, se recomienda provisionar estas identidades desde el mecanismo nativo del proveedor y deshabilitar cualquier acceso remoto del usuario administrador.

## Migraciones

Las migraciones se ejecutan en un proceso separado antes de iniciar la API:

```text
sqlserver → db-init → migrate → api → web
```

La API arranca con `Database__ApplyMigrations=false`; esto evita que varias réplicas intenten modificar el esquema simultáneamente.

## Logging y trazabilidad

Producción utiliza logs JSON por consola. Cada request incluye contexto estructurado cuando está disponible:

- `CorrelationId`;
- `TenantId`;
- `UserId`;
- método HTTP;
- path;
- código de respuesta;
- duración en milisegundos.

El contexto de usuario y tenant se limita a identificadores internos. No registrar:

- passwords;
- JWT;
- refresh tokens;
- cookies;
- secretos PayPal;
- credenciales SMTP;
- cuerpos completos de webhooks;
- datos personales del cliente salvo necesidad operacional explícita.

Los eventos de billing registran cambios de estado, tenant y plan, sin registrar tokens ni firmas del proveedor.

## Métricas y tracing

La instrumentación actual deja puntos claros para incorporar OpenTelemetry sin acoplar el dominio al proveedor de observabilidad. En una infraestructura real se recomienda exportar como mínimo:

- latencia p50/p95/p99;
- tasa de respuestas 4xx/5xx;
- disponibilidad de `/health`;
- errores de autenticación anómalos;
- fallos de webhooks PayPal;
- fallos de migración;
- uso de conexiones SQL;
- saturación de recursos del host.

## Alertas mínimas

Configurar alertas para:

1. API no saludable durante varios minutos.
2. Incremento sostenido de HTTP 5xx.
3. Migración fallida.
4. Webhooks PayPal rechazados o con error repetido.
5. SQL Server sin disponibilidad o almacenamiento cercano al límite.
6. Certificado TLS próximo a expirar.

Evitar alertas por eventos aislados que no requieran intervención.

## Backups

Para una v1 comercial se recomienda:

- backup completo diario;
- backups diferenciales o de log según RPO requerido;
- retención separada del servidor principal;
- cifrado en reposo y en tránsito;
- prueba periódica de restauración;
- documentación de RPO/RTO antes del lanzamiento público.

Un backup que nunca se ha restaurado en una prueba no debe considerarse validado.

## Secretos

Los secretos deben residir en variables de entorno seguras o un secret manager. Rotar de inmediato si cualquiera aparece en logs, artefactos, historial Git o canales no autorizados.

Separar secretos por ambiente: Development, Staging y Production nunca deben compartir credenciales.

## Red y TLS

- Terminar TLS en proxy, gateway o balanceador confiable.
- Mantener SQL Server sin exposición pública.
- Restringir el acceso de administración por red privada/VPN cuando aplique.
- Mantener `X-Forwarded-For` y `X-Forwarded-Proto` únicamente desde proxies confiables.
- Exponer solo los puertos estrictamente necesarios.

## Checklist previo al lanzamiento

- CI y Security en verde.
- Migraciones validadas sobre una copia de staging.
- Secrets reales configurados fuera del repositorio.
- PayPal live y webhook verificado.
- SMTP transaccional validado.
- Turnstile habilitado.
- DNS y TLS configurados.
- Backups y restauración probados.
- Alertas operativas configuradas.
- Política de privacidad y términos revisados.
- Auditoría de accesibilidad pendiente/completada según alcance comercial.

