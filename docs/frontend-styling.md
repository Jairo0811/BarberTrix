# Frontend styling architecture

BarberTurn mantiene CSS plano junto a React/Vite. La regla principal es **ownership por contexto**: un selector específico de un feature debe vivir con ese feature; los estilos compartidos deben contener únicamente primitivas reutilizadas por más de un módulo.

## Capas

### Globales

Los estilos globales deben limitarse a fundamentos de aplicación: reset/tokens, accesibilidad, soporte transversal y utilidades verdaderamente globales. No deben introducir selectores de Citas, Clientes, Pagos, Reportes u otro feature.

### Portal

`dashboard.css` y `role-portals.css` pertenecen al shell/portal. Pueden definir navegación, layout del dashboard y patrones de portal, pero no detalles internos de módulos comerciales.

### Compartidos comerciales

`frontend/src/shared/styles/commercial.css` contiene únicamente primitivas usadas por varios módulos, actualmente formularios, toolbars, listas, métricas y acciones comerciales.

No debe contener selectores prefijados por un feature como `.appointment-*`, `.customer-*`, `.payment-*` o `.report-*`.

### Features

Cada feature es responsable de sus estilos específicos:

- `features/appointments/appointments.css`
- `features/customers/customers.css`
- `features/payments/payments.css`
- `features/reports/reports.css`

Los nuevos módulos deben seguir la misma convención cuando su CSS deje de ser trivial.

## Reglas de mantenimiento

1. No resolver conflictos agregando un archivo `*-polish.css`, `*-patch.css` o una cascada global de overrides.
2. Corregir el selector en el stylesheet propietario.
3. Antes de mover una regla a `shared`, comprobar que tenga al menos dos consumidores reales.
4. Evitar selectores basados en la estructura accidental del DOM cuando una clase semántica sea viable.
5. Mantener breakpoints del feature junto con sus reglas base.
6. No usar `!important` salvo interoperabilidad o una razón documentada; los nuevos estilos deben preferir especificidad predecible.
7. Las rutas lazy-loaded no deben depender del orden en que otra pantalla haya cargado su CSS.

## Fase 6

La primera consolidación de esta arquitectura separó el antiguo `business-modules.css`, que mezclaba primitivas comerciales y toda la agenda de Citas, en:

- `shared/styles/commercial.css` para estilos compartidos;
- `features/appointments/appointments.css` para la agenda.

Este límite reduce el acoplamiento de estilos antes de la migración formal de routing prevista para la siguiente fase.
