# Navegación administrativa

BarberTurn separa el panel autenticado en páginas hash bajo `#/app/*`.

## Rutas

| Página | Ruta |
|---|---|
| Resumen | `#/app/overview` |
| Cola | `#/app/queue` |
| Citas | `#/app/appointments` |
| Barberos | `#/app/barbers` |
| Servicios | `#/app/services` |
| Clientes | `#/app/customers` |
| Caja | `#/app/payments` |
| Reportes | `#/app/reports` |
| Equipo | `#/app/team` |
| Sucursales | `#/app/locations` |
| Suscripción | `#/app/billing` |

`#billing-section` se conserva únicamente como compatibilidad de entrada y se normaliza a `#/app/billing`.

## Principios

- una sola página funcional se monta a la vez;
- las rutas pueden abrirse directamente y funcionan con Atrás/Adelante del navegador;
- la visibilidad del menú respeta los permisos existentes, pero el backend sigue siendo la autoridad de autorización;
- Resumen, Cola, Barberos, Servicios y Equipo comparten el snapshot operativo y SignalR;
- las páginas comerciales no levantan el snapshot de cola cuando no lo necesitan;
- una ruta no permitida se normaliza a Resumen una vez resueltos los permisos necesarios.

La infraestructura de rutas está centralizada en `frontend/src/portals/admin/adminRoutes.ts`. La migración futura a un router de React debe conservar estos identificadores y URLs para no romper deep links.
