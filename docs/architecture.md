# Arquitectura de BarberTurn

## Objetivo

BarberTurn debe crecer desde un gestor simple de filas hasta una plataforma multi-barbería sin acoplar el dominio a detalles de infraestructura o interfaz.

## Decisiones principales

1. **Monorepo** para mantener frontend, backend y documentación sincronizados.
2. **Backend modular** con límites de responsabilidad claros.
3. **Frontend por features** para favorecer escalabilidad y mantenimiento.
4. **Multi-tenancy preparada desde el dominio** mediante `BarbershopId` en entidades operativas relevantes.
5. **SignalR** para cambios de estado y pantallas en tiempo real.
6. **SQL Server + EF Core** para persistencia transaccional y migraciones.

## Backend

Estructura objetivo inicial:

```text
backend/
├── BarberTurn.sln
└── src/
    ├── BarberTurn.Api/
    ├── BarberTurn.Application/
    ├── BarberTurn.Domain/
    └── BarberTurn.Infrastructure/
```

### BarberTurn.Domain

Contendrá entidades, value objects, enums, reglas e invariantes del negocio. No dependerá de Entity Framework, ASP.NET Core ni servicios externos.

### BarberTurn.Application

Contendrá casos de uso, contratos, DTOs, validadores y orquestación. Dependerá del dominio, pero no de implementaciones de infraestructura.

### BarberTurn.Infrastructure

Implementará persistencia, autenticación, proveedores externos y demás detalles técnicos.

### BarberTurn.Api

Será el punto de entrada HTTP y SignalR. Se encargará de composición, middleware, autenticación, autorización y exposición de endpoints.

## Frontend

Estructura objetivo:

```text
frontend/
└── src/
    ├── app/
    ├── features/
    │   ├── auth/
    │   ├── barbers/
    │   ├── services/
    │   └── queue/
    ├── shared/
    └── pages/
```

La lógica específica de cada módulo permanecerá cerca de la funcionalidad a la que pertenece.

## Núcleo de dominio inicial

### Barbershop

Representa un establecimiento. Será el límite principal de aislamiento de datos.

### Barber

Profesional que puede recibir turnos y prestar uno o varios servicios.

### Service

Servicio ofrecido por una barbería, con duración estimada y configuración operativa.

### Turn

Unidad central del flujo. Debe registrar como mínimo:

- Identificador interno.
- Código visible para el cliente.
- Barbería.
- Servicio.
- Barbero asignado, cuando corresponda.
- Estado.
- Fecha y hora de creación.
- Inicio y finalización de atención.
- Cancelación o no-show cuando aplique.

## Estados de turno

Estados iniciales:

- `Waiting`
- `Called`
- `InService`
- `Completed`
- `Cancelled`
- `NoShow`

Las transiciones válidas se implementarán como reglas del dominio y no como asignaciones libres desde controladores.

## Multi-tenancy

La primera versión puede operar con una sola barbería, pero las entidades operativas se diseñarán con pertenencia explícita a un establecimiento. Toda consulta autenticada deberá filtrar por el tenant autorizado.

No se confiará en un `BarbershopId` enviado libremente por el cliente para determinar el ámbito de autorización.

## Tiempo real

SignalR se utilizará para eventos como:

- Turno creado.
- Turno llamado.
- Atención iniciada.
- Atención finalizada.
- Turno cancelado.
- Cambio de disponibilidad de barbero.

La base de datos seguirá siendo la fuente de verdad. SignalR será un mecanismo de propagación, no de persistencia.

## Seguridad

- Autenticación basada en tokens de corta duración y mecanismo seguro de renovación.
- Roles y permisos por establecimiento.
- Contraseñas gestionadas por mecanismos estándar de ASP.NET Core Identity o equivalente.
- Secrets mediante variables de entorno o gestor de secretos.
- Validación de payloads en el borde de la aplicación.
- Rate limiting en endpoints públicos sensibles.
- Logs sin credenciales, tokens ni datos sensibles innecesarios.

## Calidad

Las reglas críticas de turnos deben cubrirse con pruebas unitarias. La persistencia y los flujos HTTP principales deberán contar con pruebas de integración.

## Regla de arquitectura

Las capas internas no deben depender de las capas externas:

```text
Api -> Application -> Domain
         ^
         |
Infrastructure
```

Infraestructura implementa contratos definidos hacia el interior; el dominio permanece independiente.
