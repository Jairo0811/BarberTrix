# Navegación administrativa

BarberTrix utiliza React Router con `HashRouter` como router único del frontend web. Se conserva el contrato `#/...` para mantener compatibilidad con despliegues estáticos/Nginx sin exigir rewrites del servidor y para no romper deep links existentes.

## Rutas administrativas

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

`#billing-section` se conserva únicamente como compatibilidad de entrada y se normaliza a `#/app/billing` antes de montar el router.

## Arquitectura

- `frontend/src/main.tsx` contiene el único `HashRouter` y declara las rutas públicas y administrativas;
- `frontend/src/portals/admin/adminRoutes.ts` mantiene los identificadores, paths canónicos y validación de páginas administrativas sin depender de `window.location`;
- `frontend/src/portals/admin/hooks/useDashboardNavigation.ts` consume `useLocation` y `useNavigate`, por lo que no mantiene una segunda copia del estado de ruta ni registra listeners manuales de `hashchange`;
- `DashboardView` continúa montando una sola página funcional a la vez;
- Resumen, Cola, Barberos, Servicios y Equipo siguen compartiendo el snapshot operativo y SignalR;
- las páginas comerciales no levantan el snapshot de cola cuando no lo necesitan;
- las rutas administrativas inválidas y las páginas no permitidas se reemplazan por Resumen;
- Back/Forward y deep links quedan gestionados por el historial de React Router;
- el cambio de ruta conserva el foco accesible sobre el contenido principal/administrativo.

## HashRouter y anclas internas

Como `HashRouter` es propietario del fragmento `#`, las anclas internas de la landing (`#inicio`, `#caracteristicas`, `#precios`, `#contacto`) y el skip link no deben modificar el hash del navegador. `main.tsx` incluye una capa de compatibilidad que intercepta esas anclas y realiza `scrollIntoView` sin abandonar la ruta `#/`.

Los enlaces de navegación de aplicación sí utilizan hashes de router (`#/login`, `#/terms`, `#/app/...`) y no son interceptados.

## Reglas para nuevas rutas

1. Definir rutas públicas en el árbol `Routes` de `main.tsx`.
2. Añadir nuevas páginas administrativas a `adminPageIds` y usar `adminPagePath`/`adminPageHref`; no concatenar hashes manualmente.
3. Dentro de componentes renderizados bajo el router, preferir `useNavigate`, `Link` o `NavLink` para navegación de aplicación.
4. No registrar listeners adicionales de `hashchange` para sincronizar UI.
5. El backend continúa siendo la autoridad de autorización; ocultar una opción de navegación nunca sustituye el control de acceso de API.
