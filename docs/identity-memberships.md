# Identidad y membresías en BarberTurn

## Objetivo

Desacoplar la identidad de una persona de una barbería concreta para permitir que un usuario pueda registrarse como barbero independiente y, posteriormente, pertenecer a una o varias barberías sin duplicar cuentas.

## Modelo objetivo

```text
User
├── BarberProfile (opcional, 1:1)
└── ShopMembership (0..n)
    ├── BarberShop
    ├── Role
    ├── BarberId (solo cuando Role = Barber)
    └── Status
```

`User` representa la identidad y autenticación. `BarberProfile` representa el perfil profesional independiente de una barbería. `ShopMembership` representa la relación operativa entre una persona y una barbería.

El `Barber` existente sigue siendo el recurso operativo de una barbería: silla, disponibilidad, cola, citas y métricas. Un `BarberProfile` no reemplaza a `Barber`; una membresía con rol `Barber` enlaza ambos contextos mediante `BarberId`.

## Estados de membresía

- `Pending`: relación creada pero todavía no activa.
- `Active`: acceso operativo habilitado.
- `Suspended`: acceso temporalmente suspendido.
- `Left`: la persona terminó voluntariamente su relación con la barbería.
- `Revoked`: la barbería revocó la relación.

## Estrategia de migración

La migración se realiza de forma incremental para proteger la web v1, mobile y JWT existentes.

### ✅ Etapa A — foundation

- `BarberProfile` implementado;
- `ShopMembership` implementado;
- invariantes de dominio y pruebas implementadas;
- `User.BarberShopId`, `User.Role` y `User.BarberId` se mantienen temporalmente como contrato legacy.

### ✅ Etapa B — persistencia y compatibilidad

- nuevas entidades mapeadas en EF Core;
- migración SQL Server generada por `dotnet ef`;
- backfill de membresías equivalentes para usuarios existentes;
- backfill de perfiles profesionales para usuarios con rol `Barber`;
- registro de Owner, demo, invitaciones y seeding realizan dual-write;
- revocar un miembro sincroniza también su `ShopMembership`;
- `ShopMembership` aplica unicidad por usuario/barbería y una restricción SQL que exige `BarberId` únicamente para el rol `Barber`.

Durante esta etapa, JWT, autorización, web y mobile siguen leyendo el contexto legacy de `User`. Las nuevas tablas se escriben en paralelo para permitir una migración segura de consumidores en las etapas siguientes.

### Etapa C — registro independiente (implementada)

Nuevo flujo público:

```text
POST /api/auth/register-barber
```

El registro crea `User + BarberProfile`, pero no crea una barbería ni una membresía falsa. `Users.BarberShopId` puede ser `NULL` durante onboarding. La sesión emite `SessionScope = Onboarding` y no incluye claims `barbershop_id`, `role` ni `barber_id` hasta que exista una membresía activa.

### Etapa D — ingreso a barberías

Permitir:

1. aceptar una invitación existente;
2. solicitar ingreso a una barbería;
3. usar un código de incorporación;
4. seleccionar la barbería activa cuando exista más de una membresía.

### Etapa E — retirar campos legacy

Cuando web, API y mobile utilicen membresías como fuente de verdad:

- retirar `User.BarberShopId`;
- retirar `User.Role`;
- retirar `User.BarberId`;
- emitir contexto de barbería/rol desde la membresía seleccionada.

## Reglas de seguridad

- la autenticación identifica al `User`, no a una barbería;
- el tenant activo debe provenir de una membresía `Active` del usuario;
- nunca aceptar un `BarberShopId` del cliente sin validar la membresía correspondiente;
- el backend sigue siendo la autoridad de roles y capacidades;
- cambiar de barbería activa debe producir un contexto/autorización nuevo y auditable;
- finalizar o revocar una membresía debe invalidar el acceso a ese tenant.

## Backfill y compatibilidad

La migración valida primero que no exista un usuario legacy con `Role = Barber` y `BarberId = NULL`. Si existe, la migración falla deliberadamente para evitar crear una membresía profesional inconsistente.

Para datos válidos:

- cada usuario obtiene una `ShopMembership` equivalente a `BarberShopId + Role + BarberId`;
- usuarios activos migran con estado `Active`;
- usuarios desactivados migran con estado `Revoked`;
- cada usuario legacy con rol `Barber` obtiene un `BarberProfile` cuyo nombre inicial proviene de `User.Name`.

## Decisión importante

No se creará una barbería oculta o ficticia para registrar un barbero independiente. Eso mantendría el acoplamiento que esta migración busca eliminar y contaminaría billing, límites, reportes y aislamiento multi-tenant.
