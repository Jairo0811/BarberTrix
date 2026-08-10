# BarberTurn 💈

**BarberTurn** es una plataforma web para gestionar turnos en barberías, diseñada para digitalizar la fila de atención sin obligar al barbero a cambiar su forma de trabajar.

> **Tu turno. Tu estilo. Tu tiempo.**

## Problema que resuelve

En muchas barberías el orden de atención todavía se administra de forma verbal o informal. Esto funciona cuando hay pocos clientes, pero puede generar incertidumbre, tiempos de espera difíciles de estimar y conflictos cuando existen varios barberos, clientes con preferencias específicas o personas que salen temporalmente del local.

BarberTurn busca resolver ese problema con una experiencia progresiva: una barbería puede utilizar únicamente la fila digital o activar funciones adicionales cuando realmente las necesite.

## Principios de producto

- El software se adapta a la operación de la barbería, no al revés.
- La gestión de turnos es el núcleo del producto.
- Los turnos pueden ser anónimos para mantener el flujo rápido.
- Citas, clientes, caja y reportes son capacidades opcionales.
- La interfaz debe requerir la menor cantidad posible de pasos durante la jornada.
- La arquitectura se prepara desde el inicio para múltiples establecimientos.

## Modalidades de operación

| Modalidad | Descripción |
| --- | --- |
| Por llegada | Los clientes entran a una fila y se atienden por turno. |
| Por cita | Los clientes reservan barbero, servicio, fecha y hora. |
| Híbrida | La barbería combina citas con clientes sin reservación. |

## MVP

La primera versión se enfocará en validar el flujo principal:

- Gestión de barberías.
- Gestión de barberos.
- Catálogo de servicios.
- Creación de turnos.
- Fila de espera.
- Asignación de barbero.
- Estados del turno.
- Llamar al siguiente cliente.
- Inicio y finalización de atención.
- Cancelación y no presentación.
- Tiempo estimado de espera.
- Pantalla pública de turnos.
- Actualizaciones en tiempo real.

## Roadmap funcional

### Fase 1 — Fundación

Arquitectura, solución, autenticación, persistencia, Docker y configuración transversal.

### Fase 2 — Núcleo de turnos

Barberías, barberos, servicios, turnos y reglas de la fila de atención.

### Fase 3 — Tiempo real

SignalR, estados operativos, estimación de espera y BarberTurn TV.

### Fase 4 — Citas

Agenda, disponibilidad, reservaciones, reprogramaciones, cancelaciones y no-show.

### Fase 5 — Gestión comercial

Clientes, pagos, caja, propinas, cierres y reportes.

### Fase 6 — SaaS / multi-barbería

Aislamiento por establecimiento, configuración, roles y capacidades activables.

### Fase 7 — Producción

Testing, seguridad, CI/CD, observabilidad, documentación y hardening.

## Stack propuesto

### Frontend

- React
- TypeScript
- Tailwind CSS
- TanStack Query
- SignalR Client

### Backend

- .NET / ASP.NET Core Web API
- Entity Framework Core
- SignalR
- FluentValidation
- OpenAPI

### Datos e infraestructura

- SQL Server
- Docker / Docker Compose
- GitHub Actions

### Testing

- xUnit
- Pruebas unitarias
- Pruebas de integración
- Pruebas de componentes frontend

## Arquitectura

El backend seguirá una arquitectura modular con separación clara entre dominio, casos de uso, infraestructura y API. El frontend se organizará por funcionalidades para evitar una estructura centrada únicamente en tipos técnicos.

```text
BarberTurn/
├── backend/
├── frontend/
├── docs/
├── .github/
├── .editorconfig
├── .gitignore
└── README.md
```

La arquitectura detallada se documenta en [`docs/architecture.md`](docs/architecture.md).

## Estados iniciales de un turno

```text
Waiting -> Called -> InService -> Completed
    |         |           |
    +-------> Cancelled <-+
    +-------> NoShow
```

Las transiciones serán controladas por reglas de negocio; la API no permitirá cambios arbitrarios de estado.

## Seguridad y mantenibilidad

El desarrollo seguirá Clean Code, SOLID, DRY y KISS, priorizando:

- Validación explícita de entradas.
- Autorización basada en roles y establecimiento.
- Aislamiento de datos por barbería.
- Manejo centralizado de errores.
- Secretos fuera del repositorio.
- Migraciones versionadas.
- Logging estructurado.
- Pruebas automatizadas para reglas críticas.

## Estado del proyecto

🚧 **En desarrollo — Fase 1: Fundación**

## Autor

**Jairo Matías**
