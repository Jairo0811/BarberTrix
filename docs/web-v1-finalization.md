# Cierre de BarberTurn Web v1

Este documento separa el cierre técnico del repositorio de las dependencias externas necesarias para una salida comercial pública. BarberTurn Mobile queda fuera de este alcance y se retomará después del cierre web.

## Estado actual

La web dispone de autenticación, multi-tenancy, cola, citas, clientes, caja, reportes, equipo, sucursales, Barber Portal, Customer Portal, BarberTurn TV, demo comercial, planes, capacidades, PayPal SaaS, SignalR, i18n, accesibilidad base, CI, análisis de seguridad, cobertura progresiva, observabilidad estructurada y SQL Server con mínimo privilegio.

El cierre de integridad crítica incluye protección frente a doble reserva concurrente, replay/duplicados y eventos fuera de orden de PayPal, idempotencia de reintentos de la cola pública, autorización del barbero sobre sus propios turnos y E2E real de React + ASP.NET Core + SQL Server separado de la suite determinista con backend simulado.

La tanda final de QA añade además firma negativa de PayPal, validación explícita de horarios y zona horaria de citas, token/cancelación pública de citas, aislamiento de mutaciones entre tenants, llamadas concurrentes de cola, privacidad del display público y regresión de UI por rol y viewport.

## ✅ Cierre de código y QA

- [x] E2E de stack real que ejercita frontend + API + SQL Server sin sustituir el backend por mocks.
- [x] PayPal: firma inválida, idempotencia, eventos repetidos y estados fuera de orden.
- [x] Citas: doble reserva, concurrencia, límites de horario y zona horaria de la barbería.
- [x] Cola: transiciones concurrentes, autorización por rol, aislamiento entre tenants e idempotencia pública.
- [x] Autoservicio público: token opaco, consulta/cancelación y no exposición de datos sensibles ni identificadores internos de turnos en el display de cola.
- [x] Estados principales vacíos, carga y error revisados en Owner, Administrator, Receptionist, Barber y Customer Portal.
- [x] Regresión responsive automatizada en desktop, tablet y móvil web para experiencias críticas, incluyendo control de overflow horizontal.

Estas verificaciones forman parte de la suite automatizada y deben permanecer verdes en CI antes de fusionar cambios a la línea estable.

## ⏳ Dependencias operativas para producción pública

Estas tareas no son defectos de código ni pueden cerrarse únicamente desde el repositorio: dependen del dominio, infraestructura, credenciales, proveedores y decisiones legales reales del despliegue.

- [ ] Dominio definitivo, DNS y TLS.
- [ ] Gestor de secretos y rotación de credenciales.
- [ ] SMTP transaccional real y URLs públicas de verificación/restablecimiento.
- [ ] Turnstile/antiabuso con credenciales de producción.
- [ ] PayPal Live y webhook público definitivo.
- [ ] Backups automáticos y restauración probada.
- [ ] Métricas, alertas y centralización de logs.
- [ ] Staging con configuración equivalente a producción.
- [ ] Revisión legal de `docs/privacy.md` y `docs/terms.md`, incluyendo identidad del proveedor, jurisdicción, reembolsos, impuestos y canal formal de contacto.
- [ ] Auditoría formal de accesibilidad si se desea declarar conformidad normativa.

## Importantes antes de escalar

- [ ] Exportación de datos del tenant antes del cierre de cuenta.
- [ ] Política explícita de retención y eliminación de datos.
- [ ] Runbook de incidentes y procedimiento de recuperación.
- [ ] Prueba de carga para cola, SignalR y portales públicos.
- [ ] Métricas de producto para activación, conversión del trial y uso de funciones por plan.

## Definition of Done — código/QA Web v1

El repositorio web v1 se considera cerrado técnicamente cuando:

1. CI y Security están verdes sobre el commit candidato.
2. Los flujos críticos tienen cobertura de integración y E2E de stack real.
3. PayPal, citas, cola y autoservicio público tienen pruebas negativas, de concurrencia, aislamiento e idempotencia suficientes para el alcance v1.
4. No existen regresiones conocidas de roles, tenants, demo o capacidades comerciales.
5. Los estados principales y viewports críticos cuentan con regresión automatizada.
6. Las imágenes de producción y la estrategia separada de migraciones continúan validadas por CI.

## Definition of Done — lanzamiento público

Una salida comercial pública requiere además:

1. staging levantado con las mismas imágenes y estrategia de migración que producción;
2. backup y restauración verificados;
3. correo, antiabuso, PayPal Live, DNS y TLS configurados y probados;
4. observabilidad y alertas centralizadas;
5. textos legales revisados para el mercado de lanzamiento;
6. auditoría formal de accesibilidad si se va a declarar conformidad normativa.

## Fuera del alcance de este cierre

BarberTurn Mobile (React Native + Expo), solicitudes cliente → barbero y notificaciones push se mantienen como la siguiente línea de producto una vez cerrado el código/QA de la web v1.
