# Cierre de BarberTurn Web v1

Este documento define el trabajo restante para declarar la experiencia web de BarberTurn lista para una primera salida comercial controlada. La aplicación móvil queda fuera de este alcance y se retomará después del cierre de esta lista.

## Estado actual

La web ya dispone de autenticación, multi-tenancy, cola, citas, clientes, caja, reportes, equipo, sucursales, Barber Portal, Customer Portal, BarberTurn TV, demo comercial, planes, capacidades, PayPal SaaS, SignalR, i18n, accesibilidad base, CI, análisis de seguridad, cobertura progresiva, observabilidad estructurada y SQL Server con mínimo privilegio.

El objetivo de esta etapa no es añadir módulos indiscriminadamente, sino cerrar riesgos de regresión, operación y lanzamiento.

## Bloqueantes de código y QA

- [ ] Añadir E2E de stack real que ejercite frontend + API + SQL Server sin sustituir el backend por mocks.
- [ ] Añadir pruebas de PayPal para firma de webhook, idempotencia, eventos repetidos y estados fuera de orden.
- [ ] Añadir pruebas de citas para doble reserva, concurrencia, límites de horario y zonas horarias.
- [ ] Añadir pruebas de cola para transiciones concurrentes, autorización por rol y aislamiento entre tenants.
- [ ] Añadir pruebas del autoservicio público para token opaco, consulta/cancelación y no exposición de identificadores internos.
- [ ] Revisar los principales estados vacíos, carga y error del frontend en Owner, Administrator, Receptionist, Barber y Customer Portal.
- [ ] Ejecutar una regresión responsive final en desktop, tablet y móvil web.

## Bloqueantes operativos para producción pública

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

## Definition of Done — Web v1

La web podrá considerarse cerrada cuando:

1. CI y Security estén verdes sobre el commit candidato.
2. Los flujos críticos tengan cobertura de integración y E2E de stack real.
3. PayPal, citas, cola y autoservicio público tengan pruebas negativas y de concurrencia suficientes.
4. No existan regresiones conocidas de roles, tenants, demo o capacidades comerciales.
5. El entorno de staging pueda levantarse con las mismas imágenes y estrategia de migración que producción.
6. Exista backup y restauración verificados.
7. La configuración externa de correo, antiabuso, PayPal, DNS y TLS esté documentada y probada.
8. Los textos legales estén revisados para el mercado de lanzamiento.

## Fuera del alcance de este cierre

BarberTurn Mobile (React Native + Expo), solicitudes cliente → barbero y notificaciones push se mantienen como la siguiente línea de producto una vez cerrada la web v1.
