# BarberTurn 💈

<p align="center">
  <img src="https://skillicons.dev/icons?i=dotnet,react,ts,vite,docker,nginx,github&theme=dark" alt="Tecnologías principales de BarberTurn" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white" alt="SQL Server 2022" />
  <img src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

**BarberTurn** es una plataforma web para gestionar turnos de barberías con el menor nivel de fricción posible para el negocio y sus clientes.

> **Tu turno. Tu estilo. Tu tiempo.**

El producto nace de una premisa simple: la tecnología debe adaptarse a la forma de trabajar de la barbería, no obligar a la barbería a transformar toda su operación para poder usar el software.

## 🎯 Visión

BarberTurn comienza como un sistema de filas y turnos digitales, pero su arquitectura queda preparada para evolucionar hacia una plataforma multi-barbería con citas, clientes, caja, reportes y funciones SaaS.

La experiencia inicial debe funcionar incluso en barberías que:

- 💈 trabajan únicamente por orden de llegada;
- 👤 no quieren registrar todos los clientes;
- ✂️ utilizan varios barberos en paralelo;
- 🎯 permiten elegir un barbero específico;
- 📅 combinan clientes espontáneos con citas.

## 🚀 Estado actual

### ✅ Fase 1 — Fundación técnica

Implementada en el PR inicial:

- 🧱 solución .NET 10 con separación Domain / Application / Infrastructure / API;
- 🌐 ASP.NET Core Web API;
- 🗄️ Entity Framework Core + SQL Server;
- 🧬 migración inicial para barberías y usuarios;
- 🔐 autenticación JWT;
- 👑 registro inicial del propietario de una barbería;
- 🔑 login;
- ❤️ health check;
- 📘 OpenAPI en desarrollo;
- ⚛️ React 19 + TypeScript + Vite 8;
- 📱 interfaz inicial responsive con identidad BarberTurn;
- 🐳 Dockerfiles para API y frontend;
- 🧩 Docker Compose con SQL Server;
- ⚙️ configuración mediante variables de entorno;
- 🤖 GitHub Actions para validar backend y frontend.

## 🧰 Stack tecnológico

### 🟣 Backend

<p>
  <img src="https://skillicons.dev/icons?i=dotnet&theme=dark" height="44" alt=".NET" />
  &nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg" height="44" alt="C#" />
  &nbsp;
  <img src="https://img.shields.io/badge/ASP.NET_Core-Web_API-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt="ASP.NET Core" />
  <img src="https://img.shields.io/badge/Entity_Framework_Core-ORM-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt="Entity Framework Core" />
  <img src="https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/OpenAPI-Documentation-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white" alt="OpenAPI" />
</p>

- 🧠 Reglas de negocio separadas del framework.
- 🧩 Inyección de dependencias.
- 🔒 Autenticación Bearer con JWT.
- 📘 Contrato HTTP documentado mediante OpenAPI.

### 🔵 Frontend

<p>
  <img src="https://skillicons.dev/icons?i=react,ts,vite,html,css&theme=dark" height="44" alt="React, TypeScript, Vite, HTML y CSS" />
  &nbsp;
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/UI-Responsive-0EA5E9?style=for-the-badge" alt="Responsive UI" />
</p>

- ⚛️ React 19.
- 🟦 TypeScript.
- ⚡ Vite 8.
- 🎨 CSS modularizable desde la base del proyecto.

### 🗄️ Datos e infraestructura

<p>
  <img src="https://skillicons.dev/icons?i=docker,nginx,github&theme=dark" height="44" alt="Docker, Nginx y GitHub" />
  &nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/microsoftsqlserver/microsoftsqlserver-original.svg" height="44" alt="SQL Server" />
  &nbsp;
  <img src="https://img.shields.io/badge/SQL_Server-2022-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" alt="SQL Server 2022" />
  <img src="https://img.shields.io/badge/Docker_Compose-Orchestration-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/Nginx-Frontend-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

- 🗃️ SQL Server 2022.
- 🐳 Docker y Docker Compose.
- 🌍 Nginx para servir el frontend en producción.
- 🤖 GitHub Actions para CI.

## 🏗️ Arquitectura

```text
BarberTurn
├── backend
│   └── src
│       ├── BarberTurn.Domain
│       ├── BarberTurn.Application
│       ├── BarberTurn.Infrastructure
│       └── BarberTurn.Api
├── frontend
│   └── src
├── docs
├── .github
│   └── workflows
├── BarberTurn.sln
└── docker-compose.yml
```

### 🧩 Responsabilidades

- 🧠 **Domain:** entidades y reglas de negocio sin depender de infraestructura.
- 📋 **Application:** contratos y casos de uso.
- 🗄️ **Infrastructure:** EF Core, SQL Server, seguridad y servicios externos.
- 🌐 **Api:** exposición HTTP y configuración del host ASP.NET Core.
- ⚛️ **Frontend:** experiencia web del cliente y del personal de la barbería.

## 💈 Modelo operativo

BarberTurn contempla tres modalidades:

| Modalidad | Descripción |
|---|---|
| 🚶 Por llegada | El cliente entra a una fila y espera su turno. |
| 📅 Por cita | El cliente reserva fecha, hora, servicio y opcionalmente barbero. |
| 🔀 Híbrida | La barbería combina citas y clientes por orden de llegada. |

El **MVP se concentra en la modalidad por llegada**. Las citas se integrarán después sin alterar el núcleo de turnos.

## 👥 Roles iniciales

- 👑 **Owner:** propietario de la barbería.
- 🛠️ **Administrator:** administración general.
- 🛎️ **Receptionist:** creación y gestión operativa de turnos.
- ✂️ **Barber:** atención de clientes y control de su flujo.

Los clientes podrán generar turnos sin necesidad de crear una cuenta.

## 🔐 Seguridad

- 🔑 JWT Bearer Authentication.
- 🔒 Contraseñas almacenadas mediante hashing.
- 🧾 Secretos fuera del repositorio.
- 🏪 Preparación para aislamiento por `BarberShopId`.
- 🧪 Seeder demo limitado a `Development`.

BarberTurn no almacena claves de base de datos, secretos JWT ni contraseñas demo reales en el repositorio.

La aplicación requiere los valores mediante configuración de entorno:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `DemoAdmin__Email`
- `DemoAdmin__Password`

El JWT debe utilizar una clave de al menos 32 caracteres.

## 🐳 Ejecutar con Docker

1. 📄 Copia el archivo de entorno de ejemplo:

```bash
cp .env.example .env
```

2. 🔐 Sustituye los valores de ejemplo por secretos locales propios.

3. 🚀 Levanta la solución:

```bash
docker compose up --build
```

### 🌐 Servicios locales

- 🖥️ Frontend: `http://localhost:8081`
- 🔌 API: `http://localhost:8080/api`
- ❤️ Health check: `http://localhost:8080/health`
- 📘 OpenAPI en Development: `http://localhost:8080/openapi/v1.json`
- 🗄️ SQL Server: `localhost:1433`

Docker configura `Database__ApplyMigrations=true`, por lo que la API aplica las migraciones al iniciar el entorno local.

## 🔑 Acceso demo de desarrollo

El entorno Docker puede crear automáticamente una barbería demo y un usuario administrador al iniciar por primera vez.

### 👤 Usuario demo

- 📧 Correo: `admin@barberturn.com.do`
- 🔐 Contraseña: definida localmente mediante `DEMO_ADMIN_PASSWORD`
- 🛡️ Rol: `Administrator`
- 🏪 Barbería: `BarberTurn Demo`

Configura en `.env`:

```env
DEMO_ADMIN_EMAIL=admin@barberturn.com.do
DEMO_ADMIN_PASSWORD=tu-clave-demo-local
```

El seeding está limitado al entorno `Development`, es idempotente y solo se ejecuta cuando `DemoAdmin__Enabled=true`.

> ⚠️ La contraseña demo debe mantenerse únicamente en el archivo `.env` local y nunca debe utilizarse como credencial de producción.

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

## ✅ Principios del proyecto

- 🧼 Clean Code
- 🧱 SOLID
- ♻️ DRY
- 🎯 KISS
- 🧩 separación de responsabilidades
- 🏢 multi-tenancy preparado desde el dominio
- 🔐 configuración segura por entorno
- 📱 diseño responsive
- 🤖 automatización mediante CI

## 🗺️ Roadmap

### 💈 Fase 2 — Núcleo de turnos

- 🏪 barberías;
- ✂️ barberos;
- 🧴 servicios;
- 🎟️ generación de turnos;
- 👥 fila por establecimiento;
- 🎯 selección de barbero o próximo disponible;
- 🔄 estados `Waiting`, `Called`, `InService`, `Completed`, `Cancelled`, `NoShow`.

### ⚡ Fase 3 — Tiempo real

- 📡 SignalR;
- 🔄 actualización automática de la fila;
- ✂️ estados de barberos;
- ⏱️ estimaciones de espera;
- 📺 BarberTurn TV.

### 📅 Fase 4 — Citas

- 🗓️ calendario;
- 🟢 disponibilidad;
- 📌 reservas;
- 🔁 reprogramaciones;
- ❌ cancelaciones;
- 🚫 bloqueo de horarios.

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
- 🏪 administración de establecimientos.

### 🚀 Fase 7 — Producción

- 🧪 suite de pruebas;
- 🛡️ hardening de seguridad;
- 👁️ observabilidad;
- ☁️ despliegue;
- 📚 documentación final;
- 💼 preparación para portafolio y comercialización.

## 📚 Documentación

- 🏗️ [`docs/architecture.md`](docs/architecture.md): decisiones y estructura arquitectónica.
- 🎯 [`docs/mvp.md`](docs/mvp.md): alcance funcional del MVP.
- 🚀 [`docs/phase-1.md`](docs/phase-1.md): resumen de la fundación técnica implementada.

---

<p align="center"><strong>BarberTurn 💈 — Tu turno. Tu estilo. Tu tiempo.</strong></p>
