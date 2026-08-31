# Changelog

El proyecto sigue [Semantic Versioning](https://semver.org/) y el formato de [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- turnos públicos con consulta privada, cancelación e idempotencia;
- SignalR y BarberTurn TV;
- agenda híbrida, clientes, caja y reportes;
- equipo, invitaciones y permisos por rol;
- sesiones rotatorias, verificación de correo, auditoría y protección antiabuso;
- planes, límites, sucursales y suscripciones PayPal;
- demo aislada por sesión;
- despliegue Docker de producción y controles de seguridad en CI;
- BarberTurn Mobile M0/M1 con Expo Router, sesiones nativas y secretos en SecureStore;
- BarberTurn Mobile M2 con solicitudes cliente → barbero, seguimiento privado, bandeja de personal y SignalR.
- BarberTurn Mobile M3 con opt-in de notificaciones, registro seguro por instalación, navegación push allowlisted y outbox Expo con reintentos;
- creación administrativa de citas para Owner, Administrator y Receptionist reutilizando las reglas de disponibilidad y concurrencia de la agenda;
- ficha CRM por cliente con visitas completadas, última visita, gasto acumulado por moneda, actividad reciente y notas internas versionadas en auditoría;
- Caja 2.0 con apertura/cierre de sesión, fondo inicial, entradas y salidas manuales, conciliación esperado vs contado, historial de cierres y reembolsos trazables;
- Business Reports 2.0 con comparación contra el período anterior, ingresos y ticket promedio por moneda, breakdown por barbero/servicio/método, horas pico, actividad operativa, CSV y salida imprimible/PDF;
- guía de arquitectura de estilos frontend con reglas explícitas de ownership global, portal, shared y feature.

### Changed

- CI móvil reproducible con `npm ci`, lockfile versionado, auditoría de dependencias, typecheck y bundle Android;
- snapshot de EF Core validado como código versionado sin jobs que modifiquen una rama durante el CI;
- navegación administrativa con etiquetas localizadas e iconografía semántica por módulo;
- dashboard administrativo dividido en rutas `#/app/*`, con una única página funcional montada por vez y navegación compatible con historial/deep links;
- snapshot operativo y conexión SignalR limitados a Resumen, Cola, Barberos, Servicios y Equipo, evitando cargar la operación completa en páginas comerciales que no la necesitan;
- paywalls y retorno de checkout alineados con la ruta dedicada `#/app/billing`, conservando compatibilidad con el hash histórico `#billing-section`;
- módulo de Citas convertido en una agenda operativa con vistas Hoy/Semana, filtros por barbero y estado, agrupación diaria, creación desde administración y reprogramación mediante slots disponibles;
- QR del portal del cliente integrado como herramienta secundaria dentro del workspace de Citas;
- directorio de clientes convertido en workspace maestro-detalle con búsqueda, edición de contacto y contexto operativo del cliente;
- módulo de Caja convertido en workspace operativo con moneda fija por sesión, ventas cash/no-cash, movimientos manuales y conciliación diaria;
- pagos en efectivo requieren caja abierta y la misma moneda de la sesión; los reembolsos cash generan automáticamente una salida de caja;
- reportes Business pasan a usar límites de fecha en la zona horaria de la barbería y dejan de sumar monedas distintas en un único ingreso bruto;
- CSS comercial reorganizado por ownership: primitivas reutilizables en `shared/styles/commercial.css` y estilos de agenda en `features/appointments/appointments.css`, eliminando el antiguo stylesheet mixto `business-modules.css`;
- fixtures de frontend alineados con la capacidad `isSystemAdmin` para mantener el build tipado en verde.
