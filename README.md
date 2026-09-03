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

**BarberTrix** es una plataforma SaaS multi-tenant para gestionar la operación diaria y comercial de barberías: fila digital por llegada, citas, barberos, servicios, CRM, caja, reportes, equipo, sucursales, suscripciones, autoservicio público, experiencia TV y aplicación móvil.

> **Tu turno. Tu estilo. Tu tiempo.**

La premisa del producto es simple: la tecnología debe adaptarse a la forma de trabajar de la barbería, no al revés.

## 🌐 Producción

Frontend público de referencia:

**https://barbertrixrd.netlify.app**

El frontend se construye con Vite y puede desplegarse como SPA estática. La infraestructura completa de producción también dispone de Docker/Nginx para despliegues controlados junto al backend y SQL Server.

## 🚀 Estado del proyecto

BarberTrix tiene la **web v1 cerrada técnicamente** y continúa en preparación para una salida comercial controlada. El roadmap web de modernización **Fases 1–7 está completado**: rutas administrativas formales, Citas 2.0, CRM 2.0, Caja 2.0, Business Reports 2.0, arquitectura CSS por ownership y migración a React Router.

La línea móvil está activa con **React Native + Expo SDK 57 + Expo Router** e incluye sesión nativa segura, solicitudes cliente → barbero, realtime, notificaciones push y flujos públicos de solicitud/seguimiento.

`main` se valida mediante GitHub Actions con:

- backend .NET 10;
- frontend React;
- móvil Expo;
- auditoría de dependencias de producción;
- validación de alineación Expo;
- typecheck móvil con regeneración de typed routes;
- Playwright E2E;
- E2E full-stack React + API + SQL Server;
- construcción de contenedores de producción;
- CodeQL para C# y JavaScript/TypeScript;
- Gitleaks.

El checklist de cierre web está documentado en [`docs/web-v1-finalization.md`](docs/web-v1-finalization.md).

## ✨ Funcionalidades principales

### Operación de barbería

- 🚶 fila digital por orden de llegada;
- 📅 agenda operativa con vistas Hoy/Semana, filtros, creación administrativa y reprogramación por disponibilidad;
- ✂️ gestión de barberos y disponibilidad;
- 🧴 catálogo de servicios, duración y precios;
- 🎟️ ciclo completo `Waiting → Called → InService → Completed`;
- ❌ estados alternativos `Cancelled` y `NoShow`;
- 📊 métricas operativas de la cola;
- ⚡ SignalR para actualización en tiempo real;
- 📺 **BarberTrix TV**;
- 🌐 autoservicio público con tokens opacos.

### Gestión comercial

- 👥 **CRM 2.0** con búsqueda, edición, visitas completadas, última visita, gasto por moneda, actividad reciente y notas internas versionadas;
- 💵 **Caja 2.0** con apertura/cierre, fondo inicial, entradas/salidas, pagos, reembolsos y conciliación esperado vs. contado;
- 📈 **Business Reports 2.0** con rangos personalizados, comparación de períodos, métricas por moneda, barbero, servicio, método de pago y horas pico;
- 📤 exportación CSV localizada y salida optimizada para impresión/PDF;
- 🧑‍🤝‍🧑 equipo, invitaciones y roles;
- 🏪 sucursales y configuración por barbería;
- 🧾 auditoría de operaciones;
- 💳 planes Free / Pro / Business;
- 💰 suscripciones SaaS mediante PayPal;
- 🔒 capacidades y límites aplicados también en backend.

### Portales

- 👑 **Owner / Administrator / Receptionist:** panel administrativo según permisos;
- ✂️ **Barber Portal:** jornada, cola asignada, estado y citas propias;
- 👤 **Customer Portal:** autoservicio público sin requerir cuenta;
- 🧪 **Demo comercial limitada:** permite probar el núcleo y mantiene visibles funciones premium mediante paywalls/CTA sin exponer operaciones sensibles;
- 🧭 **React Router + HashRouter:** navegación formal preservando `#/app/*`, deep links y Back/Forward.

Rutas administrativas principales:

```text
#/app/overview
#/app/queue
#/app/appointments
#/app/barbers
#/app/services
#/app/customers
#/app/payments
#/app/reports
#/app/team
#/app/locations
#/app/billing
```

Los clientes pueden tomar turnos, reservar citas y utilizar flujos públicos de solicitud sin crear una cuenta.

## 💳 Capacidades por plan

Las capacidades se validan en servidor; ocultar o bloquear una opción en React nunca es el único control.

| Capacidad | Free | Pro | Business |
|---|:---:|:---:|:---:|
| Cola por llegada | ✅ 1,000/mes (+50 tolerancia) | ✅ alto volumen | ✅ alto volumen |
| Barberos activos | **3** | 10 | Ilimitados |
| Servicios activos | Ilimitados | Ilimitados | Ilimitados |
| Historial de turnos | 1 mes calendario (28/29/30/31 días) | Completo | Completo |
| Notificaciones esenciales | ✅ | ✅ | ✅ |
| Citas | ✅ | ✅ | ✅ |
| BarberTrix TV | ❌ | ✅ | ✅ |
| Automatizaciones avanzadas | ❌ | ✅ | ✅ |
| Reportes avanzados | ❌ | ❌ | ✅ |
| Multi-location | 1 | 1 | Hasta 3 |

Free es el piso permanente y absorbe la operación esencial que antes separaba Starter: citas, notificaciones esenciales, servicios ilimitados, 1,000 turnos mensuales con 50 de tolerancia y un historial cuya ventana usa la duración del mes calendario local de la barbería. Cancelar o perder una suscripción no elimina datos ni bloquea seguridad, identidad, notificaciones esenciales, citas o turnos existentes. El backend es la fuente de verdad para entitlements. Consulta [`docs/plans-and-entitlements.md`](docs/plans-and-entitlements.md).

## 🌍 Internacionalización

BarberTrix tiene **10 locales oficiales de producto** y utiliza el mismo catálogo en web y móvil:

| Locale | Idioma |
|---|---|
| `es-419` | Español latinoamericano |
| `en` | English |
| `pt-BR` | Português do Brasil |
| `fr` | Français |
| `ht` | Kreyòl ayisyen |
| `de` | Deutsch |
| `it` | Italiano |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `zh-CN` | 简体中文 |

Características de i18n:

- detección automática BCP 47 en web y móvil;
- todos los locales oficiales son elegibles para modo Auto;
- todos los locales oficiales son estrictos: no se usa fallback silencioso al inglés;
- cualquier variante española se normaliza a `es-419`;
- `zh*` se normaliza a `zh-CN` y `pt*` a `pt-BR`;
- fechas, horas, monedas, estados, roles y exportaciones CSV utilizan el locale activo;
- los mensajes técnicos crudos del backend no se muestran directamente en superficies localizadas;
- `es-ES` permanece únicamente como compatibilidad histórica móvil y se normaliza a `es-419`; no es un locale oficial.

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
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/microsoftsqlserver/microsoftsqlserver-original.svg" height="48" alt="SQL Server" />
  <img src="https://skillicons.dev/icons?i=docker,nginx,github&theme=dark" height="48" alt="Docker, Nginx y GitHub" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="SQL Server 2022" />
  <img src="https://img.shields.io/badge/Docker_Compose-Orchestration-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/Nginx-Frontend-009639?style=flat-square&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/Netlify-Frontend_Reference-00C7B7?style=flat-square&logo=netlify&logoColor=white" alt="Netlify" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/CodeQL-Security-181717?style=flat-square&logo=github&logoColor=white" alt="CodeQL" />
  <img src="https://img.shields.io/badge/Gitleaks-Secret_Scan-6E40C9?style=flat-square&logo=github&logoColor=white" alt="Gitleaks" />
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
BarberTrix
├── backend
│   ├── src
│   │   ├── BarberTurn.Domain
│   │   ├── BarberTurn.Application
│   │   ├── BarberTurn.Infrastructure
│   │   └── BarberTurn.Api
│   └── tests
├── frontend
│   ├── e2e
│   └── src
│       ├── features
│       ├── portals
│       ├── i18n
│       ├── shared
│       └── ...
├── mobile
│   ├── app
│   └── src
├── deploy
│   └── sql
├── docs
├── .github
│   └── workflows
├── BarberTurn.sln
├── docker-compose.yml
└── docker-compose.production.yml
```

### Responsabilidades

- **Domain:** entidades, estados e invariantes de negocio.
- **Application:** contratos, DTOs y casos de uso sin depender de EF Core.
- **Infrastructure:** persistencia, SQL Server, servicios externos y adaptadores.
- **API:** transporte HTTP, autenticación/autorización, middleware y composición.
- **Frontend:** portales y features desacoplados por responsabilidad.
- **Mobile:** experiencia React Native/Expo con sesión segura, realtime, solicitudes públicas y notificaciones push.

La dependencia conceptual buscada es:

```text
API
 ↓
Application
 ↓
Infrastructure
 ↓
SQL Server / proveedores externos
```

Los endpoints no deben convertirse en una segunda capa de persistencia ni consultar el `DbContext` para lógica de negocio que corresponda a Application/Infrastructure.

### Arquitectura web

La navegación web utiliza un único `HashRouter` como fuente de verdad. `adminRoutes.ts` expone paths canónicos y parsing puro; el dashboard deriva la página activa desde la URL mediante `useLocation()` / `useNavigate()`.

La arquitectura CSS sigue ownership explícito:

```text
Global
  ↓
Portal
  ↓
Shared
  ↓
Feature
```

Los estilos específicos de una feature viven con esa feature; las primitivas compartidas solo se promueven a `shared` cuando existen consumidores reales en más de un módulo.

## 🏷️ Identidad del proyecto y nombres técnicos heredados

**BarberTrix es el nombre oficial y vigente del producto y del repositorio.**

No debe utilizarse **BarberTurn** como nombre comercial en nueva documentación, UI, copy de producto, material de marketing o futuras funcionalidades.

El código conserva temporalmente algunos identificadores internos heredados, entre ellos:

- namespaces y assemblies `BarberTurn.*`;
- `BarberTurn.sln`;
- algunos package names internos;
- variables de entorno `BARBERTURN_*`;
- ciertos nombres de infraestructura y archivos históricos.

Estos identificadores permanecen por compatibilidad técnica y **no representan la marca actual**. Su eventual migración debe realizarse como una fase técnica independiente, con revisión de namespaces, assemblies, migraciones EF Core, configuración, Docker, CI/CD y compatibilidad de despliegues.

## 🔐 Seguridad

Controles relevantes:

- access tokens JWT de vida corta;
- refresh token rotatorio en cookie `HttpOnly` y `SameSite=Lax`, `Secure` bajo HTTPS;
- revocación de sesión y security stamp;
- hashing de contraseñas;
- política de contraseña de 10+ caracteres con mayúscula, minúscula, número y símbolo;
- aislamiento multi-tenant por `BarberShopId`;
- autorización por roles;
- verificación de correo;
- recuperación de contraseña sin enumeración de usuarios;
- rate limiting para autenticación, registro, autoservicio y webhooks;
- separación SignalR por audiencias `internal`, `public` y `tv`;
- encabezados HTTP de seguridad;
- validación de firma de webhooks PayPal;
- secretos exclusivamente mediante configuración externa;
- CodeQL y Gitleaks en CI.

Los errores API utilizan un contrato estable:

```json
{
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "...",
  "correlationId": "..."
}
```

El frontend localiza el mensaje mediante `code`; `correlationId` permite rastrear incidentes sin revelar detalles internos.

Consulta [`SECURITY.md`](SECURITY.md) para el proceso de reporte y los controles vigentes.

### Seguridad de dependencias móviles

El cliente móvil mantiene sus paquetes administrados por Expo alineados con:

```bash
npx expo install --check
```

Este comando es un **gate bloqueante de CI**. Además, el typecheck regenera primero los typed routes de Expo Router para evitar validar contra `.expo/types` obsoletos.

`npm audit` reporta actualmente hallazgos moderados transitivos provenientes principalmente de dos cadenas upstream de Expo:

- `decode-uri-component` → `query-string` → `expo-router`;
- `uuid@7` → `xcode` → configuración/CLI de Expo.

No se utiliza `npm audit fix --force`, porque la remediación automática propuesta implica downgrades incompatibles con Expo SDK 57. Los hallazgos altos y críticos de dependencias de producción continúan siendo bloqueantes.

Consulta [`docs/mobile-dependency-security.md`](docs/mobile-dependency-security.md).

## 🔭 Observabilidad

BarberTrix incorpora:

- `X-Correlation-ID` por request;
- logs JSON en Production;
- contexto estructurado de tenant/usuario cuando existe;
- método, path, status code y duración de requests;
- logging específico de billing/webhooks sin registrar tokens, firmas ni secretos;
- health check de base de datos.

La arquitectura queda preparada para incorporar OpenTelemetry, métricas y tracing cuando exista infraestructura real de observabilidad.

Nunca deben registrarse passwords, JWT, refresh tokens, cookies, secretos SMTP/PayPal ni cuerpos completos de webhooks.

## 🗄️ SQL Server y mínimo privilegio

`docker-compose.production.yml` separa las identidades de base de datos:

```text
sa
└─ bootstrap inicial de la instancia

barberturn_migrator
└─ aplica migraciones

barberturn_app
└─ runtime de la API
```

Los nombres `barberturn_*` son identificadores técnicos heredados. La API **no se conecta como `sa`**: el usuario de runtime recibe únicamente permisos de lectura/escritura requeridos por la aplicación y el usuario migrador ejecuta las migraciones antes del arranque de la API.

Variables heredadas de producción actualmente soportadas:

```text
BARBERTURN_DB_PASSWORD
BARBERTURN_DB_MIGRATOR_PASSWORD
BARBERTURN_DB_APP_PASSWORD
```

Consulta [`docs/production-operations.md`](docs/production-operations.md) para backups, alertas, secretos, TLS y checklist de lanzamiento.

## 🧪 Testing y calidad

### Backend

- pruebas de dominio;
- integración API + SQL Server;
- autenticación, refresh/logout y cookies;
- aislamiento multi-tenant;
- Caja 2.0 y conciliación contra SQL Server real;
- reglas financieras de moneda y reembolsos;
- error codes y correlation IDs;
- validación de migraciones;
- gates progresivos sobre lógica crítica.

### Frontend

Vitest + React Testing Library cubren, entre otros:

- autenticación;
- demo;
- roles y redirecciones;
- parsing de rutas administrativas;
- Barber Portal;
- paywalls/capabilities;
- política de contraseñas;
- errores localizados;
- paridad de diccionarios y política de locales oficiales.

### E2E

BarberTrix mantiene dos niveles de Playwright deliberadamente separados:

1. **E2E de navegador con backend simulado**, para validar de forma determinista los principales flujos de interfaz y permisos.
2. **E2E full-stack real**, que levanta React + ASP.NET Core + SQL Server 2022 y valida flujos reales contra datos persistidos.

El job `Full-stack E2E (React + API + SQL Server)` forma parte del CI y es requisito previo para construir las imágenes de producción.

### Mobile

CI valida:

- `npm ci` reproducible;
- auditoría de dependencias de producción;
- `npx expo install --check`;
- regeneración de Expo Router typed routes;
- `tsc --noEmit`;
- export/bundle Android.

## ♿ Accesibilidad

La interfaz incorpora una base técnica alineada con buenas prácticas de NORTIC B2 / WCAG:

- navegación por teclado;
- foco visible;
- skip link compatible con `HashRouter`;
- `aria-live`, `aria-describedby`, `aria-busy`, `aria-pressed`;
- gestión de foco al cambiar de ruta/vista;
- semántica para lectores de pantalla;
- `prefers-reduced-motion`;
- formularios con errores asociados.

Esto **no constituye certificación formal** sin una auditoría completa.

## 🐳 Desarrollo local

Desde la raíz:

```bash
cp .env.example .env
docker compose up --build
```

Servicios por defecto:

- Frontend: `http://localhost:8081`
- API: `http://localhost:8080/api`
- Health: `http://localhost:8080/health`
- OpenAPI Development: `http://localhost:8080/openapi/v1.json`
- SQL Server: `localhost:1433`

### Frontend

```bash
cd frontend
npm ci
npm run build
```

### Mobile

```bash
cd mobile
npm ci
npx expo install --check
npm run typecheck
npm start
```

El typecheck móvil ejecuta primero la regeneración de tipos de ruta de Expo Router.

## 🚀 Producción con Docker

```bash
cp .env.production.example .env.production
# Configurar secretos reales
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Orden de arranque:

```text
SQL Server
→ bootstrap de identidades
→ migraciones
→ API
→ frontend
```

Requisitos externos antes de un lanzamiento comercial:

- DNS y TLS;
- gestor de secretos;
- SMTP transaccional;
- Turnstile;
- PayPal Live + webhook;
- backups y restauración probada;
- métricas/alertas centralizadas;
- revisión legal;
- auditoría formal de accesibilidad según alcance.

## 🗺️ Roadmap

### ✅ Roadmap técnico web — Fases 1–7

- ✅ **Fase 1:** páginas administrativas y rutas `#/app/*`;
- ✅ **Fase 2:** Citas 2.0 / agenda operativa;
- ✅ **Fase 3:** CRM 2.0;
- ✅ **Fase 4:** Caja / Payments 2.0;
- ✅ **Fase 5:** Business Reports 2.0;
- ✅ **Fase 6:** CSS / UI Architecture Cleanup;
- ✅ **Fase 7:** migración formal a React Router preservando deep links e historial.

### ✅ Internacionalización comercial

- ✅ 10 locales oficiales;
- ✅ detección automática BCP 47 web/móvil;
- ✅ modo estricto sin fallback silencioso a inglés;
- ✅ administración comercial localizada;
- ✅ estados, roles, fechas, monedas y CSV localizados;
- ✅ flujos públicos y móviles localizados.

### 🟢 Hardening web v1

- ✅ refresh token HttpOnly y rotación segura;
- ✅ aislamiento multi-tenant reforzado;
- ✅ SignalR por audiencias;
- ✅ demo comercial limitada y portales por rol;
- ✅ error codes y correlation IDs;
- ✅ frontend modular por features;
- ✅ CSS con ownership explícito;
- ✅ React Router con URLs hash compatibles;
- ✅ Vitest + Testing Library;
- ✅ Playwright E2E;
- ✅ E2E full-stack React + ASP.NET Core + SQL Server;
- ✅ cobertura y gates progresivos en CI;
- ✅ migraciones desacopladas;
- ✅ logging estructurado;
- ✅ SQL mínimo privilegio;
- ✅ concurrencia crítica de citas y cola;
- ✅ replay/idempotencia y orden de eventos PayPal;
- ⏳ regresión visual/responsive y cierre de configuración operativa externa.

### 📱 Línea móvil activa

- ✅ React Native + Expo SDK 57 + Expo Router;
- ✅ sesiones móviles seguras con refresh token rotatorio en SecureStore;
- ✅ solicitudes cliente → barbero con aceptación, rechazo y contraoferta;
- ✅ realtime con SignalR mientras la aplicación está abierta;
- ✅ notificaciones push transaccionales;
- ✅ flujos públicos de solicitud y seguimiento;
- ✅ i18n alineado con los 10 locales oficiales;
- ✅ typed routes regenerados antes del typecheck;
- ✅ dependencias Expo alineadas y validadas en CI;
- ⏳ preparación de distribución Android/iOS.

### ⏳ Puesta en infraestructura real

- DNS/TLS definitivo;
- proveedores reales de correo, Turnstile y PayPal;
- observabilidad centralizada y alertas;
- backups/restauración;
- auditoría de accesibilidad;
- revisión legal y operativa previa al lanzamiento.

### 🔄 Migración técnica de naming

- ⏳ migrar namespaces/assemblies `BarberTurn.*` a la nueva convención técnica de BarberTrix;
- ⏳ renombrar solution/package identifiers heredados;
- ⏳ migrar variables `BARBERTURN_*` con compatibilidad de transición;
- ⏳ revisar Docker, CI/CD, scripts y documentación técnica asociada.

Esta migración no debe realizarse como un reemplazo masivo de texto: requiere una fase controlada para evitar romper builds, migraciones EF Core, secretos o despliegues existentes.

## 📚 Documentación

- 🏗️ [`docs/architecture.md`](docs/architecture.md) — arquitectura y decisiones técnicas.
- 🧭 [`docs/admin-routing.md`](docs/admin-routing.md) — rutas web, React Router y navegación administrativa.
- 🎨 [`docs/frontend-styling.md`](docs/frontend-styling.md) — ownership y arquitectura CSS.
- 🎯 [`docs/mvp.md`](docs/mvp.md) — alcance funcional.
- ✅ [`docs/web-v1-finalization.md`](docs/web-v1-finalization.md) — checklist de cierre web v1.
- 📱 [`mobile/README.md`](mobile/README.md) — arquitectura, seguridad y ejecución del cliente móvil.
- 🛡️ [`docs/mobile-dependency-security.md`](docs/mobile-dependency-security.md) — postura de dependencias móviles y advisories upstream.
- 🚀 [`docs/production-operations.md`](docs/production-operations.md) — operación, mínimo privilegio, observabilidad, backups y checklist.
- 🔐 [`SECURITY.md`](SECURITY.md) — política y controles de seguridad.
- 🤝 [`CONTRIBUTING.md`](CONTRIBUTING.md) — guía de contribución.
- 📝 [`CHANGELOG.md`](CHANGELOG.md) — historial relevante.
- ⚖️ [`docs/privacy.md`](docs/privacy.md) / [`docs/terms.md`](docs/terms.md) — borradores legales para revisión.

---

<p align="center"><strong>BarberTrix 💈 — Tu turno. Tu estilo. Tu tiempo.</strong></p>