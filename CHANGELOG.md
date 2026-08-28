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

### Changed

- CI móvil reproducible con `npm ci`, lockfile versionado, auditoría de dependencias, typecheck y bundle Android;
- snapshot de EF Core validado como código versionado sin jobs que modifiquen una rama durante el CI.
