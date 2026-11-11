# BarberTrix — staging aislado y protocolo de aceptación

**Estado:** preparado como código de infraestructura; **no desplegado ni aceptado**.
Este overlay deriva de `docker-compose.production.yml` para probar las mismas imágenes y migraciones, pero fuerza **PayPal Sandbox** y deshabilita push. **Jamás usar cuentas PayPal Live en staging.**

## Arquitectura y límites de seguridad

- Proyecto Compose exclusivo: `barbertrix-staging`; los volúmenes con nombres derivados del proyecto se separan de producción.
- SQL Server es interno: ni el puerto SQL 1433 ni la API exponen puertos del host.
- El servicio web solo publica **127.0.0.1:8088**, no Internet. Para pruebas remotas, colocar delante un proxy HTTPS confiable, configurar el dominio DNS de staging y validar encabezados de proxy antes de invitar usuarios.
- `PayPal__Sandbox=true` se fuerza en el overlay, junto con `Push__Enabled=false` (sin mensajes a dispositivos reales).
- Se conserva `ASPNETCORE_ENVIRONMENT=Production` para ejecutar comprobaciones reales de autenticación, correo y secretos, evitando funcionalidades solo disponibles en Development.
- La API está detrás de Nginx; no desplegarla como servicio público independiente sin revisar la política `ReverseProxy__TrustAnyProxy`.
- **Health checks veraces:** `/health` verifica solamente Nginx; `/health/live` y `/health/ready` se envían a ASP.NET Core. `/health/ready` **debe devolver 503** si SQL Server no responde; nunca aceptes un 200 generado estáticamente por el proxy como evidencia de disponibilidad de la API.
- **Terminación TLS en staging:** `deploy/staging/nginx.conf` está montado **solo en el stack de staging** y fuerza `X-Forwarded-Proto: https` al backend. Es válido únicamente cuando `127.0.0.1:8088` está detrás de un proxy HTTPS de confianza en la misma máquina. **No publiques 8088 por HTTP hacia Internet ni reutilices este archivo en un servidor HTTP público.** El Nginx general continúa reflejando el esquema real de la conexión y requiere una revisión independiente cuando se configure el proxy de producción.
- **Nginx y salud:** GitHub Actions valida la sintaxis de ambas configuraciones, verifica las ubicaciones de health y comprueba que staging monte la configuración restringida en solo lectura.
- No hay servicio BarberTrix ni SQL Server aprovisionado en Render por este cambio. No se crean servicios, bases de datos, dominios ni pagos automáticamente.

## Configurar SIN publicar secretos

1. Confirmar Docker Compose **2.24.4 o posterior** (necesario para `!override` en la lista de puertos).
2. Copiar `.env.staging.example` a `.env.staging` local. `.env.staging` está ignorado por Git. Usar valores de prueba **únicos y distintos de producción**; nunca completar el ejemplo ni hacer commit de credenciales.
3. Definir un hostname HTTPS de staging y alinear `BARBERTRIX_PUBLIC_ORIGIN`, `BARBERTRIX_ALLOWED_HOSTS`, CORS y Turnstile. Registrar ese hostname en el proveedor de Turnstile.
4. Usar un buzón SMTP **de pruebas** controlado; la verificación de correo y el reset deben llegar allí. Nunca usar destinatarios de clientes reales.
5. Configurar una aplicación PayPal **Sandbox**, sus planes y webhook Sandbox apuntando a una URL HTTPS de staging que reciba `/api/webhooks/paypal`. Rechazar cualquier Client ID, secreto o plan Live.
6. Proteger el acceso a staging (IP allowlist, VPN o autenticación de entrada) y preparar backups y métricas independientes.

## Validación estática (sin desplegar)

```bash
docker compose --project-name barbertrix-staging --env-file .env.staging.example \
  -f docker-compose.production.yml -f docker-compose.staging.yml \
  config --format json | python3 scripts/staging/check_compose.py
```

El comando no imprime valores de secretos, porque solo el verificador recibe la configuración JSON. No ejecutar `docker compose config` solo en un log público si se usan secretos reales.

## Validación operativa (requiere aprobación e infraestructura)

Después de completar `.env.staging` con credenciales de prueba y confirmar HTTPS/proxy, ejecutar:

```bash
docker compose --project-name barbertrix-staging --env-file .env.staging \
  -f docker-compose.production.yml -f docker-compose.staging.yml \
  up -d --build
```

No compartir la salida completa de `config`, logs con tokens, archivos `.env`, datos de prueba personales ni credenciales. Recolectar solamente PASS/FAIL, fecha, SHA y links de evidencias saneadas.

## Matriz de aceptación (pendiente de pruebas reales)

| Flujo | Evidencia mínima | Estado |
| --- | --- | --- |
| Despliegue inicial | migración, `/health/live` y `/health/ready` con DB sana | PENDIENTE |
| Registro Owner | Turnstile válido, inválido, expirado; sin exponer secreto | PENDIENTE |
| Correo | correo de verificación y reset en buzón controlado | PENDIENTE |
| Autenticación | login, refresh, logout y cookie segura detrás de HTTPS | PENDIENTE |
| Multi-tenant | un Owner de tenant A no modifica datos de B | PENDIENTE |
| Reservas públicas | invitado web, protección de doble reserva y cancelación por token | PENDIENTE |
| Reservas Mobile | cliente registrado; continuidad de sesión en Android/iOS | PENDIENTE |
| Cola/TV | cambio de estado y actualización por SignalR sin datos personales | PENDIENTE |
| PayPal Sandbox | checkout, activación, repetición de webhook y cancelación | PENDIENTE |
| Recuperación | backup independiente, restauración aislada y RPO/RTO | PENDIENTE |
| Monitoreo | detección de fallos de API, SQL, webhook y almacenamiento | PENDIENTE |
| HTTPS | esquema/cookies correctos y sin redirect loop en reverse proxy | PENDIENTE |

## Aceptación funcional de reservas

Hay **dos experiencias diferentes**: (1) **web pública** `/#/book?shop=<slug>`: admite reservas como invitado y cancelación/consulta mediante token opaco, en función de las capacidades de la barbería; (2) **Marketplace/Discovery Mobile**: la reserva asociada al perfil e historial del cliente requiere autenticación. La documentación debe describir estos flujos por separado; no cambiar el endpoint de reservas web a autenticado sin un requisito de producto aprobado.

## Criterio de salida

No etiquetar `v1.0.0` ni habilitar transacciones Live hasta evidenciar cada prueba aplicable, definir soporte y textos legales, y tener autorización explícita. Ver `docs/release-candidate.md` e issue #128.
