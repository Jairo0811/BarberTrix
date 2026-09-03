<p align="center">
  <img src="docs/images/barberturn-logo.png" alt="Logo de BarberTrix" width="720" />
</p>

# BarberTrix

**BarberTrix** es una plataforma SaaS multi-tenant y multi-superficie para barberías: operación Web/Desktop, aplicación móvil para profesionales y clientes, BarberTrix TV, fila digital, citas, CRM, caja, reportes, equipos, sucursales, suscripciones y Marketplace/Discovery.

> **Tu turno. Tu estilo. Tu tiempo.**

## 🚀 Estado actual

La web v1 está cerrada técnicamente. El backend .NET + SQL Server es la fuente de verdad compartida por Web/Desktop, Mobile y TV.

- **Web/Desktop:** operación administrativa, cola, citas, CRM 2.0, Caja 2.0, Business Reports 2.0, equipo, sucursales y billing.
- **Mobile:** React Native + Expo, autenticación segura, roles diferenciados, Discovery, realtime, push, Team Management y perfil público de Marketplace.
- **TV:** pairing seguro de displays, tokens revocables, cola en tiempo real y anuncios audiovisuales; disponible según entitlement.

## 🧭 Marketplace / Discovery

Una barbería no aparece automáticamente por crear una cuenta. El Owner controla un **perfil público** separado de la operación privada.

```text
Owner
  ↓
Completar perfil público
  ↓
Ubicación + servicios + barberos activos
  ↓
Activar Turno ahora y/o Reservar cita
  ↓
Publicar en Discovery
  ↓
Cliente encuentra la barbería
```

Discovery aprovecha información operativa real de BarberTrix: personas esperando, barberos disponibles, precio inicial y espera estimada. La dirección del producto es ayudar al cliente a encontrar la opción que puede atenderle mejor, no limitarse a listar negocios por proximidad.

## 👥 Equipo y vinculación de barberos

La identidad del usuario se mantiene separada de su relación con una barbería. BarberTrix soporta dos caminos:

```text
Barbero independiente → buscar barbería → solicitar unirse → Owner/Admin aprueba → asignación de silla
```

```text
Owner/Admin → Equipo → invitar miembro → empleado acepta → queda vinculado a la barbería
```

Roles principales:

- `Owner`: propietario; administra negocio, Marketplace y equipo;
- `Administrator`: administración delegada;
- `Receptionist`: operación de recepción según permisos;
- `Barber`: jornada, disponibilidad, cola y citas propias;
- `Client`: Discovery y experiencia cliente, sin acceso al workspace profesional.

El modelo utiliza memberships, solicitudes e invitaciones en lugar de duplicar identidades.

## 🧪 Usuarios de prueba

El entorno de desarrollo puede sembrar perfiles diferenciados para validar permisos y experiencia por rol.

| Perfil | Correo | Experiencia |
|---|---|---|
| Administrador de prueba | `admin@barbertrix.com.do` | Administración y validación de capacidades/planes |
| Barbero empleado | `barbero@barbertrix.com.do` | Workspace profesional de barbero vinculado |
| Dueño + barbero | `dueno.barbero@barbertrix.com.do` | Gestión del negocio + operación como barbero |
| Cliente | `cliente@barbertrix.com.do` | Discovery y experiencia cliente |

> Las contraseñas de prueba **no se almacenan en el repositorio**. Se obtienen de la configuración segura de desarrollo (`SystemAdmin:Password` / `DemoAdmin:Password`). El seeder migra el correo administrativo histórico `admin@barberturn.com.do` a `admin@barbertrix.com.do` cuando corresponde.

## 💳 Planes

Las capacidades se validan en servidor; ocultar una función en la interfaz nunca es el único control.

| Capacidad | Free | Pro | Business |
|---|:---:|:---:|:---:|
| Cola por llegada | ✅ 1,000/mes (+50 tolerancia) | ✅ alto volumen | ✅ alto volumen |
| Barberos activos | 3 | 10 | Ilimitados |
| Servicios activos | Ilimitados | Ilimitados | Ilimitados |
| Historial de turnos | 1 mes calendario | Completo | Completo |
| Notificaciones esenciales | ✅ | ✅ | ✅ |
| Citas | ✅ | ✅ | ✅ |
| BarberTrix TV | ❌ | ✅ | ✅ |
| Automatizaciones avanzadas | ❌ | ✅ | ✅ |
| Reportes avanzados | ❌ | ❌ | ✅ |
| Multi-location | 1 | 1 | Hasta 3 |

Consulta `docs/plans-and-entitlements.md` para la política completa.

## 🌍 Internacionalización

BarberTrix mantiene 10 locales oficiales en Web y Mobile: `es-419`, `en`, `pt-BR`, `fr`, `ht`, `de`, `it`, `ja`, `ko` y `zh-CN`.

## 🧰 Stack tecnológico

### Backend
- .NET 10 / C#;
- ASP.NET Core Web API;
- Entity Framework Core;
- SQL Server 2022;
- JWT + refresh rotation;
- SignalR;
- PayPal REST API;
- Domain / Application / Infrastructure / API.

### Web / Desktop
- React 19;
- React Router + HashRouter;
- TypeScript;
- Vite;
- Vitest / React Testing Library;
- Playwright.

### Mobile
- React Native 0.86;
- React 19;
- Expo SDK 57;
- Expo Router 57;
- TypeScript 6;
- TanStack Query;
- SignalR;
- Expo SecureStore;
- Expo Notifications.

### Infraestructura
- SQL Server 2022;
- Docker / Docker Compose;
- Nginx;
- GitHub Actions;
- CodeQL;
- Gitleaks.

## 🏗️ Arquitectura

```text
                    BARBERTRIX
                        │
                .NET API + SQL Server
                        │
          ┌─────────────┼─────────────┐
          │             │             │
      WEB/DESKTOP      MOBILE          TV
          │             │             │
       Gestión       Profesional     Experiencia
       negocio        + cliente       en local
```

## 🔐 Seguridad

- secretos fuera del repositorio;
- access token móvil únicamente en memoria;
- refresh token rotatorio mediante SecureStore;
- autorización multi-tenant en backend;
- rate limiting en endpoints públicos;
- entitlements aplicados en servidor;
- CI con auditorías, CodeQL y Gitleaks.

## 🧪 Validación

`main` se protege mediante GitHub Actions para backend .NET, frontend React, Mobile Expo, auditoría de dependencias, typecheck, Playwright E2E, E2E full-stack con SQL Server, contenedores de producción y análisis de seguridad.

## 🌐 Producción

Frontend público de referencia: `https://barbertrixrd.netlify.app`

## 📚 Documentación

- `docs/web-v1-finalization.md`
- `docs/plans-and-entitlements.md`
- `docs/mobile.md`
- `docs/architecture.md`

---

**BarberTrix** evoluciona de un gestor de turnos a una plataforma integral para descubrir, reservar y operar barberías desde Web/Desktop, Mobile y TV.
