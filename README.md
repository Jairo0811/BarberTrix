<p align="center">
  <img src="docs/images/barberturn-logo.png" alt="Logo de BarberTurn" width="720" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="SQL Server 2022" />
  <img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/i18n-es--419%20%7C%20en%20%7C%20es--ES-0EA5E9?style=flat-square" alt="Idiomas: Español Latino, Inglés y Español de España" />
  <img src="https://img.shields.io/badge/Accesibilidad-NORTIC_B2%20%2F%20WCAG-22C55E?style=flat-square" alt="Accesibilidad basada en NORTIC B2 y WCAG" />
  <img src="https://img.shields.io/badge/Fase_1-Completada-22C55E?style=flat-square" alt="Fase 1 completada" />
  <img src="https://img.shields.io/badge/Fase_2-Completada-22C55E?style=flat-square" alt="Fase 2 completada" />
</p>

**BarberTurn** es una plataforma web para gestionar turnos de barberías con el menor nivel de fricción posible para el negocio y sus clientes.

> **Tu turno. Tu estilo. Tu tiempo.**

El producto nace de una premisa simple: la tecnología debe adaptarse a la forma de trabajar de la barbería, no obligar a la barbería a transformar toda su operación para poder usar el software.

## 🎯 Visión

BarberTurn comienza como un sistema de filas y turnos digitales, pero su arquitectura está preparada para evolucionar hacia una plataforma multi-barbería con citas, clientes, caja, reportes, BarberTurn TV y funciones SaaS.

La experiencia inicial está diseñada para barberías que:

- 💈 trabajan por orden de llegada;
- 👤 no quieren registrar obligatoriamente a todos los clientes;
- ✂️ utilizan varios barberos en paralelo;
- 🎯 permiten elegir un barbero específico;
- 📅 combinarán en el futuro clientes espontáneos con citas;
- 🌎 necesitan operar en distintos mercados e idiomas.

## 🚀 Estado actual

BarberTurn ya cuenta con un **MVP funcional del flujo de turnos por llegada**, acompañado de una experiencia web pública, autenticación, dashboard operativo, acceso demo, accesibilidad reforzada y soporte multidioma.

### ✅ Fase 1 — Fundación técnica

- 🧱 solución .NET 10 con separación `Domain / Application / Infrastructure / API`;
- 🌐 ASP.NET Core Web API;
- 🗄️ Entity Framework Core + SQL Server;
- 🧬 migraciones iniciales;
- 🔐 autenticación JWT;
- 👑 registro inicial del propietario de una barbería;
- 🔑 login;
- 🔄 recuperación y restablecimiento seguro de contraseña;
- ❤️ health check;
- 📘 OpenAPI en Development;
- ⚛️ React 19 + TypeScript + Vite 8;
- 🐳 Dockerfiles para API y frontend;
- 🧩 Docker Compose con SQL Server;
- 🌍 Nginx para servir el frontend;
- ⚙️ configuración mediante variables de entorno;
- 🤖 GitHub Actions para validar backend, frontend y tests.

### ✅ Fase 2 — Núcleo de turnos

- ✂️ gestión de barberos;
- 🧴 gestión de servicios;
- 🎟️ generación de turnos;
- 🔢 numeración diaria tipo `A-001`, `A-002`, etc.;
- 👥 cola por barbería;
- 🎯 selección de barbero específico o flujo operativo por disponibilidad;
- 🔄 ciclo de estados `Waiting`, `Called`, `InService`, `Completed`, `Cancelled`, `NoShow`;
- ✂️ estados de barbero `Available`, `Busy`, `Break`, `Offline`;
- 🔐 endpoints operativos protegidos con JWT;
- 🏪 aislamiento por `BarberShopId` obtenido desde el token;
- 📊 métricas operativas de la cola;
- 🧪 pruebas de dominio para transiciones válidas e inválidas.

### 🎨 Experiencia web actual

- 🏠 Home público responsive con branding BarberTurn;
- 🔐 login rediseñado con iconografía consistente, mostrar/ocultar contraseña y opción `Recordarme`;
- 📝 registro de barbería/propietario;
- 🔄 recuperación y restablecimiento de contraseña;
- 👤 acceso mediante Usuario Demo en Development;
- 📊 Dashboard V2 con sidebar, topbar, KPIs, cola y accesos rápidos;
- 💈 gestión visual de turnos, barberos y servicios;
- 🧭 navegación interna preparada para módulos futuros;
- 🧪 onboarding y señalización persistente cuando se utiliza el modo demo;
- 📱 interfaz responsive para escritorio, tablet y móvil;
- 📨 sección de soporte y contacto;
- 🎯 iconografía normalizada y centrada visualmente;
- 📅 footer con año dinámico.

### ♿ Accesibilidad

La interfaz incorpora una base técnica de accesibilidad alineada con buenas prácticas de **NORTIC B2 / WCAG** sin alterar la identidad visual oscura del producto.

- ⌨️ navegación mediante teclado;
- 🎯 foco visible consistente;
- ⏭️ enlace global **«Saltar al contenido principal»**;
- 🔊 uso de `aria-live`, `aria-describedby`, `aria-busy` y `aria-pressed` donde corresponde;
- 🧭 gestión de foco al cambiar de vista;
- 🏷️ títulos de página dinámicos;
- 🧑‍🦯 mejoras semánticas para lectores de pantalla;
- 🎞️ respeto de `prefers-reduced-motion`;
- 📝 formularios con errores e instrucciones asociados programáticamente.

> Esta base mejora la accesibilidad del producto, pero no implica por sí sola certificación formal de conformidad sin una auditoría completa.

### 🌐 Multidioma

BarberTurn soporta actualmente tres locales:

| Locale | Idioma |
|---|---|
| `es-419` | Español Latino |
| `en` | English |
| `es-ES` | Español de España |

Características de internacionalización:

- 🌍 detección automática del idioma del navegador;
- 💾 persistencia de la selección en `localStorage`;
- 🔁 cambio de idioma sin recargar la aplicación;
- 🧑‍🦯 actualización dinámica de `<html lang>`;
- 🗓️ fechas adaptadas al locale seleccionado;
- 🧩 Home, Login, Registro, Recuperación, Demo y Dashboard localizados;
- 🎛️ selector global de idioma accesible y responsive;
- 🇪🇸 diferenciación entre `es-419` y `es-ES` solo cuando el uso regional realmente lo requiere.

La convención del proyecto es **no forzar diferencias artificiales entre variantes del español**: los textos se mantienen iguales cuando son naturales en ambos mercados.

## 🧰 Stack tecnológico

### 🟣 Backend

<p align="left">
  <img src="https://skillicons.dev/icons?i=dotnet&theme=dark" height="48" alt=".NET" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg" height="48" alt="C#" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/ASP.NET_Core-Web_API-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="ASP.NET Core" />
  <img src="https://img.shields.io/badge/Entity_Framework_Core-ORM-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt="Entity Framework Core" />
  <img src="https://img.shields.io/badge/JWT-Authentication-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/OpenAPI-Documentation-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white" alt="OpenAPI" />
</p>

- 🧠 reglas de negocio separadas del framework;
- 🧩 inyección de dependencias;
- 🔒 autenticación Bearer con JWT;
- 🏪 contexto de barbería derivado del token autenticado;
- 📘 contrato HTTP documentado mediante OpenAPI.

### 🔵 Frontend

<p align="left">
  <img src="https://skillicons.dev/icons?i=react,ts,vite,html,css&theme=dark" height="48" alt="React, TypeScript, Vite, HTML y CSS" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/UI-Responsive-0EA5E9?style=flat-square" alt="Responsive UI" />
  <img src="https://img.shields.io/badge/Icons-Font_Awesome-528DD7?style=flat-square&logo=fontawesome&logoColor=white" alt="Font Awesome" />
</p>

- ⚛️ React 19;
- 🟦 TypeScript;
- ⚡ Vite 8;
- 🎨 estilos organizados por experiencia/pantalla;
- 📱 diseño responsive;
- ♿ accesibilidad transversal;
- 🌐 internacionalización propia y tipada;
- 🔐 persistencia de sesión mediante `localStorage` o `sessionStorage`;
- 🎯 Font Awesome para iconografía consistente.

### 🗄️ Datos e infraestructura

<p align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/microsoftsqlserver/microsoftsqlserver-original.svg" height="48" alt="SQL Server" />
  <img src="https://skillicons.dev/icons?i=docker,nginx,github&theme=dark" height="48" alt="Docker, Nginx y GitHub" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="SQL Server 2022" />
  <img src="https://img.shields.io/badge/Docker_Compose-Orchestration-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/Nginx-Frontend-009639?style=flat-square&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

- 🗃️ SQL Server 2022;
- 🐳 Docker y Docker Compose;
- 🌍 Nginx para servir el frontend;
- 🤖 GitHub Actions para CI.

## 🏗️ Arquitectura

```text
BarberTurn
├── backend
│   ├── src
│   │   ├── BarberTurn.Domain
│   │   ├── BarberTurn.Application
│   │   ├── BarberTurn.Infrastructure
│   │   └── BarberTurn.Api
│   └── tests
│       └── BarberTurn.Domain.Tests
├── frontend
│   └── src
│       ├── i18n.ts
│       ├── LanguageSwitcher.tsx
│       └── ...
├── docs
├── .github
│   └── workflows
├── BarberTurn.sln
└── docker-compose.yml
```

### 🧩 Responsabilidades

- 🧠 **Domain:** entidades, estados y reglas de negocio sin depender de infraestructura.
- 📋 **Application:** contratos y casos de uso.
- 🗄️ **Infrastructure:** EF Core, SQL Server, seguridad, persistencia y servicios externos.
- 🌐 **Api:** endpoints HTTP y configuración del host ASP.NET Core.
- ⚛️ **Frontend:** experiencia pública, autenticación, accesibilidad, internacionalización y operación diaria.
- 🧪 **Tests:** validación de reglas críticas del dominio.

## 💈 Modelo operativo

BarberTurn contempla tres modalidades:

| Modalidad | Estado | Descripción |
|---|---|---|
| 🚶 Por llegada | ✅ MVP actual | El cliente entra a una fila y espera su turno. |
| 📅 Por cita | ⏳ Fase 4 | El cliente reserva fecha, hora, servicio y opcionalmente barbero. |
| 🔀 Híbrida | ⏳ Evolución | La barbería combina citas y clientes por orden de llegada. |

El **MVP actual se concentra en la modalidad por llegada**. Las citas se incorporarán posteriormente sin alterar el núcleo existente de turnos.

## 🔄 Flujo principal del MVP

```text
Barbería
   ↓
Usuario autenticado
   ↓
Barberos + Servicios
   ↓
Nuevo turno
   ↓
Waiting
   ↓
Called
   ↓
InService
   ↓
Completed
```

También se contemplan los estados `Cancelled` y `NoShow`.

## 👥 Roles iniciales

- 👑 **Owner:** propietario de la barbería.
- 🛠️ **Administrator:** administración general.
- 🛎️ **Receptionist:** creación y gestión operativa de turnos.
- ✂️ **Barber:** atención de clientes y control de su flujo.

Los clientes podrán generar turnos sin necesidad de crear una cuenta en la evolución del flujo público.

## 🔐 Seguridad

- 🔑 JWT Bearer Authentication;
- 🔒 contraseñas almacenadas mediante hashing;
- 🧾 secretos fuera del repositorio;
- 🏪 aislamiento operativo por `BarberShopId`;
- 🛡️ endpoints administrativos protegidos por rol;
- 🔄 recuperación de contraseña con token temporal y propósito específico;
- 🕵️ respuesta genérica en recuperación para evitar enumeración de usuarios;
- 🧪 seeder y acceso demo limitados a `Development`.

BarberTurn no almacena claves de base de datos, secretos JWT ni contraseñas demo reales en el repositorio.

La aplicación recibe configuración sensible mediante variables de entorno, entre ellas:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `DemoAdmin__Email`
- `DemoAdmin__Password`

El JWT debe utilizar una clave de al menos 32 caracteres.

## 👤 Usuario Demo

En `Development`, BarberTurn puede crear una barbería demo y permitir acceso mediante un flujo dedicado sin exponer las credenciales en el bundle de React.

- 🏪 Barbería: `BarberTurn Demo`;
- 🛡️ Rol: `Administrator`;
- 🔐 credenciales obtenidas desde configuración del backend;
- 🧠 sesión demo almacenada únicamente en `sessionStorage`;
- 🚫 endpoint demo no disponible fuera de `Development`.

El dashboard identifica visualmente el modo demo y muestra un onboarding con las funciones disponibles para probar.

## 🐳 Ejecutar con Docker

1. Copia el archivo de entorno de ejemplo:

```bash
cp .env.example .env
```

2. Sustituye los valores de ejemplo por secretos locales propios.

3. Levanta la solución:

```bash
docker compose up --build
```

### 🌐 Servicios locales

- 🖥️ Frontend: `http://localhost:8081`
- 🔌 API: `http://localhost:8080/api`
- ❤️ Health check: `http://localhost:8080/health`
- 📘 OpenAPI en Development: `http://localhost:8080/openapi/v1.json`
- 🗄️ SQL Server: `localhost:1433`

Docker configura `Database__ApplyMigrations=true`, por lo que la API puede aplicar las migraciones al iniciar el entorno local.

## 🔌 Autenticación inicial

### 📝 Registrar la primera barbería

`POST /api/auth/register-owner`

```json
{
  "barberShopName": "BarberTurn Central",
  "barberShopSlug": "barberturn-central",
  "name": "Administrador",
  "email": "admin@example.com",
  "password": "ChangeThisPassword123!"
}
```

### 🔐 Iniciar sesión

`POST /api/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "ChangeThisPassword123!"
}
```

### 🔄 Recuperar contraseña

```text
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

En producción, el enlace de recuperación deberá entregarse mediante un proveedor transaccional de correo. En `Development` el flujo puede exponerse temporalmente para facilitar pruebas locales.

## ✅ Principios del proyecto

- 🧼 Clean Code
- 🧱 SOLID
- ♻️ DRY
- 🎯 KISS
- 🧩 separación de responsabilidades
- 🏢 multi-tenancy preparado desde el dominio
- 🔐 configuración segura por entorno
- 📱 diseño responsive
- ♿ accesibilidad desde la interfaz
- 🌐 internacionalización preparada para crecimiento comercial
- 🧪 reglas críticas cubiertas mediante tests
- 🤖 automatización mediante CI

## 🗺️ Roadmap

### ✅ Fase 1 — Fundación técnica

Completada.

### ✅ Fase 2 — Núcleo de turnos

Completada.

### ⚡ Fase 3 — Tiempo real

- 📡 SignalR;
- 🔄 actualización automática de la fila;
- ✂️ sincronización de estados de barberos;
- ⏱️ estimaciones de espera;
- 📺 BarberTurn TV;
- 🔔 eventos operativos en tiempo real.

### 📅 Fase 4 — Citas

- 🗓️ calendario;
- 🟢 disponibilidad;
- 📌 reservas;
- 🔁 reprogramaciones;
- ❌ cancelaciones;
- 🚫 bloqueo de horarios;
- 🔀 convivencia con la fila por llegada.

### 💰 Fase 5 — Gestión comercial

- 👤 clientes;
- 📚 historial;
- 💳 pagos;
- 🧾 caja;
- 📊 reportes;
- 📈 indicadores del negocio.

### 🏢 Fase 6 — SaaS

- ⚙️ configuración avanzada por barbería;
- 🔐 aislamiento completo por tenant;
- 💳 planes y suscripciones;
- 🏪 administración de establecimientos;
- 📦 límites y capacidades por plan.

### 🚀 Fase 7 — Producción

- 🧪 ampliación de la suite de pruebas;
- 🛡️ hardening de seguridad;
- 👁️ observabilidad;
- ☁️ despliegue;
- 📧 proveedor transaccional de correo;
- ♿ auditoría final de accesibilidad;
- 🌐 revisión final de localización;
- 📚 documentación final;
- 💼 preparación para comercialización.

## 📚 Documentación

- 🏗️ [`docs/architecture.md`](docs/architecture.md): decisiones y estructura arquitectónica.
- 🎯 [`docs/mvp.md`](docs/mvp.md): alcance funcional del MVP.
- 🚀 [`docs/phase-1.md`](docs/phase-1.md): fundación técnica del proyecto.

---

<p align="center"><strong>BarberTurn 💈 — Tu turno. Tu estilo. Tu tiempo.</strong></p>
