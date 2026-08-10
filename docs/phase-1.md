# Fase 1 — Fundación técnica

## Objetivo

Establecer una base ejecutable, segura y mantenible sobre la cual implementar el núcleo de turnos de BarberTurn.

## Implementado

### Backend

- .NET 10.
- ASP.NET Core Web API.
- Arquitectura separada en Domain, Application, Infrastructure y Api.
- Entity Framework Core con SQL Server.
- Migración inicial de `BarberShops` y `Users`.
- Registro del propietario y creación inicial de barbería.
- Login con JWT.
- Password hashing mediante `PasswordHasher<TUser>`.
- Configuración de CORS.
- Health check.
- OpenAPI en Development.
- Validación obligatoria de secretos y connection string en runtime.

### Frontend

- React 19.
- TypeScript.
- Vite 8.
- Layout inicial responsive.
- Identidad visual oscura con acento azul BarberTurn.
- Hero de producto.
- Vista previa de indicadores y fila en vivo.

### Infraestructura

- Dockerfile multi-stage para API.
- Dockerfile multi-stage para frontend.
- Nginx para el frontend.
- Docker Compose con SQL Server, API y frontend.
- `.env.example` sin secretos reales.
- GitHub Actions para restore/build de backend y frontend.

## Decisiones importantes

1. Los clientes no necesitan una cuenta para participar en el futuro flujo de turnos.
2. Todo dato operativo deberá quedar asociado a una barbería (`BarberShopId`).
3. Los secretos nunca se versionan en `appsettings.json`.
4. Las migraciones solo se aplican automáticamente cuando `Database__ApplyMigrations=true`.
5. El módulo de citas no forma parte del núcleo de la Fase 2 y se añadirá posteriormente.

## Siguiente fase

La Fase 2 implementará barberos, servicios, turnos, estados, fila por barbería, selección de barbero y reglas de transición.
