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

La migración se realizará de forma incremental para proteger la web v1, mobile y JWT existentes.

### Etapa A — foundation

- añadir `BarberProfile`;
- añadir `ShopMembership`;
- establecer invariantes de dominio y pruebas;
- mantener temporalmente `User.BarberShopId`, `User.Role` y `User.BarberId` como contrato legacy.

### Etapa B — persistencia y compatibilidad

- mapear las nuevas entidades en EF Core;
- crear migración de SQL Server;
- generar membresías equivalentes para usuarios existentes;
- crear perfiles profesionales para usuarios barbero existentes;
- hacer que registro de Owner e invitaciones creen también las nuevas relaciones.

### Etapa C — registro independiente

Nuevo flujo público:

```text
POST /api/auth/register-barber
```

El registro crea `User + BarberProfile`, pero no crea una barbería ni una membresía falsa. La sesión queda en modo onboarding hasta que exista al menos una membresía activa.

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

## Decisión importante

No se creará una barbería oculta o ficticia para registrar un barbero independiente. Eso mantendría el acoplamiento que esta migración busca eliminar y contaminaría billing, límites, reportes y aislamiento multi-tenant.
