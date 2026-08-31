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
- creación administrativa de citas para Owner, Administrator y Receptionist reutilizando las reglas de disponibilidad y concurrencia de la agenda.

### Changed

- CI móvil reproducible con `npm ci`, lockfile versionado, auditoría de dependencias, typecheck y bundle Android;
- snapshot de EF Core validado como código versionado sin jobs que modifiquen una rama durante el CI;
- navegación administrativa con etiquetas localizadas e iconografía semántica por módulo;
- dashboard administrativo dividido en rutas `#/app/*`, con una única página funcional montada por vez y navegación compatible con historial/deep links;
- snapshot operativo y conexión SignalR limitados a Resumen, Cola, Barberos, Servicios y Equipo, evitando cargar la operación completa en páginas comerciales que no la necesitan;
- paywalls y retorno de checkout alineados con la ruta dedicada `#/app/billing`, conservando compatibilidad con el hash histórico `#billing-section`;
- módulo de Citas convertido en una agenda operativa con vistas Hoy/Semana, filtros por barbero y estado, agrupación diaria, creación desde administración y reprogramación mediante slots disponibles;
- QR del portal del cliente integrado como herramienta secundaria dentro del workspace de Citas;
- directorio de clientes con búsqueda local por nombre, teléfono o correo;
- consulta de caja limitada a movimientos históricos de los últimos 30 días y estados vacíos más claros;
- fixtures de frontend alineados con la capacidad `isSystemAdmin` para mantener el build tipado en verde.
