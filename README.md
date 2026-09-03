<p align="center">
  <img src="docs/images/barberturn-logo.png" alt="Logo de BarberTrix" width="720" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=dotnet,react,ts,vite,docker,nginx,github&theme=dark" alt="Tecnologías principales de BarberTrix" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/Expo_SDK-57-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="SQL Server 2022" />
  <img src="https://img.shields.io/badge/i18n-10_locales-0EA5E9?style=flat-square" alt="10 idiomas oficiales" />
  <img src="https://img.shields.io/badge/Accesibilidad-NORTIC_B2%20%2F%20WCAG-22C55E?style=flat-square" alt="Base de accesibilidad alineada con NORTIC B2 y WCAG" />
</p>

<p align="center">
  <a href="https://github.com/Jairo0811/BarberTrix/actions/workflows/ci.yml">
    <img src="https://github.com/Jairo0811/BarberTrix/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://github.com/Jairo0811/BarberTrix/actions/workflows/security.yml">
    <img src="https://github.com/Jairo0811/BarberTrix/actions/workflows/security.yml/badge.svg" alt="Security" />
  </a>
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

| Perfil | Correo | Experiencia |
|---|---|---|
| Administrador de prueba | `admin@barbertrix.com.do` | Administración y validación de capacidades/planes |
| Barbero empleado | `barbero@barbertrix.com.do` | Workspace profesional de barbero vinculado |
| Dueño + barbero | `dueno.barbero@barbertrix.com.do` | Gestión del negocio + operación como barbero |
| Cliente | `cliente@barbertrix.com.do` | Discovery y experiencia cliente |

> Las contraseñas de prueba **no se almacenan en el repositorio**. Se obtienen de la configuración segura de desarrollo (`SystemAdmin:Password` / `DemoAdmin:Password`). El seeder migra el correo administrativo histórico `admin@barberturn.com.do` a `admin@barbertrix.com.do` cuando corresponde.

## 💳 Planes

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

### 🟣 Backend

<p align="left">
  <img src="https://skillicons.dev/icons?i=dotnet&theme=dark" height="48" alt=".NET" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg" height="48" alt="C#" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/ASP.NET_Core-Web_API-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="ASP.NET Core Web API" />
  <img src="https://img.shields.io/badge/Entity_Framework_Core-ORM-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="Entity Framework Core" />
  <img src="https://img.shields.io/badge/JWT-Refresh_Rotation-111827?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT con refresh rotation" />
  <img src="https://img.shields.io/badge/SignalR-Realtime-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="SignalR" />
  <img src="https://img.shields.io/badge/OpenAPI-Development-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white" alt="OpenAPI" />
  <img src="https://img.shields.io/badge/PayPal-REST_API-003087?style=flat-square&logo=paypal&logoColor=white" alt="PayPal REST API" />
</p>

- .NET 10;
- C#;
- ASP.NET Core Web API;
- Entity Framework Core;
- SQL Server 2022;
- JWT + refresh rotation;
- SignalR;
- OpenAPI en Development;
- PayPal REST API;
- arquitectura por capas Domain / Application / Infrastructure / API.

### 🔵 Frontend web

<p align="left">
  <img src="https://skillicons.dev/icons?i=react,ts,vite,html,css&theme=dark" height="48" alt="React, TypeScript, Vite, HTML y CSS" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/React_Router-7.18.3-CA4245?style=flat-square&logo=reactrouter&logoColor=white" alt="React Router 7.18.3" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Font_Awesome-Icons-528DD7?style=flat-square&logo=fontawesome&logoColor=white" alt="Font Awesome" />
  <img src="https://img.shields.io/badge/Vitest-4-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest 4" />
  <img src="https://img.shields.io/badge/Playwright-1.62-2EAD33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright 1.62" />
</p>

- React 19;
- React Router 7.18.3 con `HashRouter`;
- TypeScript 5.9;
- Vite 8;
- CSS modularizado por ownership global / portal / shared / feature;
- Font Awesome;
- QRCode;
- SweetAlert2;
- Vitest + React Testing Library;
- Playwright.

### 📱 Mobile

<p align="left">
  <img src="https://img.shields.io/badge/React_Native-0.86.3-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React Native 0.86.3" />
  <img src="https://img.shields.io/badge/Expo_SDK-57-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/Expo_Router-57-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo Router 57" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?style=flat-square&logo=reactquery&logoColor=white" alt="TanStack Query 5" />
  <img src="https://img.shields.io/badge/SignalR-Realtime-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="SignalR" />
  <img src="https://img.shields.io/badge/Expo_SecureStore-Secure_Session-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo SecureStore" />
  <img src="https://img.shields.io/badge/Expo_Notifications-Push-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo Notifications" />
</p>

- React Native 0.86;
- React 19;
- Expo SDK 57;
- Expo Router 57;
- TypeScript 6;
- TanStack Query;
- SignalR;
- Expo SecureStore;
- Expo Notifications;
- typed routes regenerados antes de `tsc --noEmit`;
- export/bundle Android validado en CI.

### 🗄️ Datos e infraestructura

<p align="left">
  <img src="https://skillicons.dev/icons?i=docker,nginx,github&theme=dark" height="48" alt="Docker, Nginx y GitHub" />
</p>

- SQL Server 2022;
- Docker + Docker Compose;
- Nginx;
- Netlify para el frontend público de referencia;
- GitHub Actions;
- CodeQL;
- Gitleaks;
- cobertura backend/frontend con gates progresivos.

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

## 🌐 Producción

Frontend público de referencia: `https://barbertrixrd.netlify.app`

## 📚 Documentación

- `docs/web-v1-finalization.md`
- `docs/plans-and-entitlements.md`
- `docs/mobile.md`
- `docs/architecture.md`

---

**BarberTrix** evoluciona de un gestor de turnos a una plataforma integral para descubrir, reservar y operar barberías desde Web/Desktop, Mobile y TV.
