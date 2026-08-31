from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f"Expected block not found in {path}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


# Domain defaults: Free is the permanent floor, not an expiring trial.
domain = "backend/src/BarberTurn.Domain/Entities/DomainEntities.cs"
replace_once(domain, "        TrialEndsAtUtc = DateTimeOffset.UtcNow.AddDays(14);\n", "        TrialEndsAtUtc = null;\n")
replace_once(domain, "    public SubscriptionPlan Plan { get; private set; } = SubscriptionPlan.Starter;\n    public SubscriptionStatus SubscriptionStatus { get; private set; } = SubscriptionStatus.Trialing;\n", "    public SubscriptionPlan Plan { get; private set; } = SubscriptionPlan.Free;\n    public SubscriptionStatus SubscriptionStatus { get; private set; } = SubscriptionStatus.Active;\n")
replace_once(domain, "public enum SubscriptionPlan\n{\n    Starter = 1,\n    Pro = 2,\n    Business = 3\n}\n", "public enum SubscriptionPlan\n{\n    Free = 0,\n    Starter = 1,\n    Pro = 2,\n    Business = 3\n}\n")

# Application contract: expose quotas and premium automation as explicit entitlements.
contracts = "backend/src/BarberTurn.Application/Common/ServiceContracts.cs"
text = read(contracts)
start = text.index("public enum PlanFeature")
end = text.index("public interface IShopLookupService")
new_block = '''public enum PlanFeature
{
    Appointments,
    Tv,
    AdvancedReports,
    AdvancedAutomation
}

public interface IPlanLimitService
{
    Task EnsureCanAddBarberAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task EnsureCanAddServiceAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task EnsureCanAddLocationAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task EnsureCanCreateTurnAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task EnsureCanUseAsync(Guid barberShopId, PlanFeature feature, CancellationToken cancellationToken = default);
    Task<PlanUsageResponse> GetUsageAsync(Guid barberShopId, CancellationToken cancellationToken = default);
}

public sealed record PlanUsageResponse(
    SubscriptionPlan Plan,
    SubscriptionStatus Status,
    int ActiveBarbers,
    int BarberLimit,
    int ActiveServices,
    int ServiceLimit,
    int ActiveLocations,
    int LocationLimit,
    int TurnsThisMonth,
    int MonthlyTurnLimit,
    int MonthlyTurnGraceLimit,
    int HistoryRetentionDays,
    bool CanUseAppointments,
    bool CanUseTv,
    bool CanUseAdvancedReports,
    bool CanUseAdvancedAutomation,
    bool IsDemo,
    bool IsSystemAdmin);

'''
write(contracts, text[:start] + new_block + text[end:])

# Infrastructure entitlements: Free remains usable; paid plans only expand limits/features.
ops = "backend/src/BarberTurn.Infrastructure/Common/OperationalServices.cs"
text = read(ops)
start = text.index("internal sealed class PlanLimitService")
end = text.index("internal sealed class AuditService")
new_plan_service = '''internal sealed class PlanLimitService(ApplicationDbContext dbContext, IConfiguration configuration) : IPlanLimitService
{
    private const int Unlimited = int.MaxValue;

    public async Task EnsureCanAddBarberAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        if (usage.ActiveBarbers >= usage.BarberLimit)
            throw new InvalidOperationException($"The {usage.Plan} plan allows up to {FormatLimit(usage.BarberLimit)} active barbers.");
    }

    public async Task EnsureCanAddServiceAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        if (usage.ActiveServices >= usage.ServiceLimit)
            throw new InvalidOperationException($"The {usage.Plan} plan allows up to {FormatLimit(usage.ServiceLimit)} active services.");
    }

    public async Task EnsureCanAddLocationAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        if (usage.ActiveLocations >= usage.LocationLimit)
            throw new InvalidOperationException($"The {usage.Plan} plan allows up to {FormatLimit(usage.LocationLimit)} active locations.");
    }

    public async Task EnsureCanCreateTurnAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        if (usage.MonthlyTurnGraceLimit == Unlimited)
            return;
        if (usage.TurnsThisMonth >= usage.MonthlyTurnGraceLimit)
            throw new InvalidOperationException($"The {usage.Plan} plan includes {usage.MonthlyTurnLimit} turns per month and its grace allowance of {usage.MonthlyTurnGraceLimit} has been reached. Upgrade the plan to create new turns.");
    }

    public async Task<PlanUsageResponse> GetUsageAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var shop = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);
        var activeBarbers = await dbContext.Barbers.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive, cancellationToken);
        var activeServices = await dbContext.BarberServices.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive, cancellationToken);
        var activeLocations = await dbContext.ShopLocations.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive, cancellationToken);
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId);
        var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);
        var monthStart = new DateOnly(localNow.Year, localNow.Month, 1);
        var nextMonth = monthStart.AddMonths(1);
        var turnsThisMonth = await dbContext.Turns.CountAsync(
            x => x.BarberShopId == barberShopId && x.QueueDate >= monthStart && x.QueueDate < nextMonth,
            cancellationToken);

        var isDemo = shop.Slug.StartsWith("demo-", StringComparison.OrdinalIgnoreCase);
        var systemAdminEmail = configuration["SystemAdmin:Email"] ?? configuration["DemoAdmin:Email"];
        var isSystemAdmin = false;
        if (!string.IsNullOrWhiteSpace(systemAdminEmail))
        {
            var normalizedSystemAdminEmail = systemAdminEmail.Trim().ToLowerInvariant();
            isSystemAdmin = await dbContext.Users.AsNoTracking().AnyAsync(
                x => x.BarberShopId == barberShopId && x.Email == normalizedSystemAdminEmail && x.IsActive,
                cancellationToken);
        }

        var rawStatus = shop.SubscriptionStatus == SubscriptionStatus.Trialing && shop.TrialEndsAtUtc <= DateTimeOffset.UtcNow
            ? SubscriptionStatus.PastDue
            : shop.SubscriptionStatus;
        var paidEntitlement = rawStatus is SubscriptionStatus.Active or SubscriptionStatus.Trialing && shop.Plan != SubscriptionPlan.Free;
        var effectivePlan = isSystemAdmin
            ? SubscriptionPlan.Business
            : isDemo
                ? SubscriptionPlan.Pro
                : paidEntitlement
                    ? shop.Plan
                    : SubscriptionPlan.Free;
        var effectiveStatus = effectivePlan == SubscriptionPlan.Free ? SubscriptionStatus.Active : rawStatus;

        var barberLimit = isSystemAdmin ? Unlimited : isDemo ? 3 : effectivePlan switch
        {
            SubscriptionPlan.Free => 2,
            SubscriptionPlan.Starter => 5,
            SubscriptionPlan.Pro => 10,
            _ => Unlimited
        };
        var serviceLimit = isSystemAdmin || isDemo ? Unlimited : effectivePlan == SubscriptionPlan.Free ? 5 : Unlimited;
        var locationLimit = isSystemAdmin ? Unlimited : isDemo ? 1 : effectivePlan == SubscriptionPlan.Business ? 3 : 1;
        var monthlyTurnLimit = isSystemAdmin || isDemo ? Unlimited : effectivePlan switch
        {
            SubscriptionPlan.Free => 100,
            SubscriptionPlan.Starter => 1000,
            _ => Unlimited
        };
        var monthlyTurnGraceLimit = monthlyTurnLimit switch
        {
            100 => 110,
            1000 => 1050,
            _ => Unlimited
        };
        var historyRetentionDays = isSystemAdmin || isDemo ? Unlimited : effectivePlan switch
        {
            SubscriptionPlan.Free => 7,
            SubscriptionPlan.Starter => 90,
            _ => Unlimited
        };
        var canUseAppointments = isSystemAdmin || isDemo || effectivePlan is SubscriptionPlan.Pro or SubscriptionPlan.Business;
        var canUseTv = isSystemAdmin || isDemo || effectivePlan is SubscriptionPlan.Pro or SubscriptionPlan.Business;
        var canUseAdvancedReports = isSystemAdmin || !isDemo && effectivePlan == SubscriptionPlan.Business;
        var canUseAdvancedAutomation = isSystemAdmin || !isDemo && effectivePlan is SubscriptionPlan.Pro or SubscriptionPlan.Business;

        return new PlanUsageResponse(
            effectivePlan,
            effectiveStatus,
            activeBarbers,
            barberLimit,
            activeServices,
            serviceLimit,
            activeLocations,
            locationLimit,
            turnsThisMonth,
            monthlyTurnLimit,
            monthlyTurnGraceLimit,
            historyRetentionDays,
            canUseAppointments,
            canUseTv,
            canUseAdvancedReports,
            canUseAdvancedAutomation,
            isDemo,
            isSystemAdmin);
    }

    public async Task EnsureCanUseAsync(Guid barberShopId, PlanFeature feature, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        var allowed = feature switch
        {
            PlanFeature.Appointments => usage.CanUseAppointments,
            PlanFeature.Tv => usage.CanUseTv,
            PlanFeature.AdvancedReports => usage.CanUseAdvancedReports,
            PlanFeature.AdvancedAutomation => usage.CanUseAdvancedAutomation,
            _ => false
        };
        if (!allowed)
            throw new InvalidOperationException($"The {feature} feature is not available for the current BarberTurn plan.");
    }

    private static string FormatLimit(int value) => value == Unlimited ? "unlimited" : value.ToString(System.Globalization.CultureInfo.InvariantCulture);
}

'''
write(ops, text[:start] + new_plan_service + text[end:])

# Queue enforcement: services and turn creation are limited server-side; history is retained by plan.
queue = "backend/src/BarberTurn.Infrastructure/Queue/QueueService.cs"
replace_once(queue, "    public async Task<ServiceResponse> CreateServiceAsync(Guid barberShopId, CreateServiceRequest request, CancellationToken cancellationToken = default)\n    {\n        var service = new BarberService", "    public async Task<ServiceResponse> CreateServiceAsync(Guid barberShopId, CreateServiceRequest request, CancellationToken cancellationToken = default)\n    {\n        await planLimitService.EnsureCanAddServiceAsync(barberShopId, cancellationToken);\n        var service = new BarberService")
replace_once(queue, "        take = Math.Clamp(take, 1, 500);\n        var turns = dbContext.Turns.AsNoTracking()", "        take = Math.Clamp(take, 1, 500);\n        var usage = await planLimitService.GetUsageAsync(barberShopId, cancellationToken);\n        if (usage.HistoryRetentionDays != int.MaxValue)\n        {\n            var today = await GetLocalDateAsync(barberShopId, cancellationToken);\n            var minimumDate = today.AddDays(-(usage.HistoryRetentionDays - 1));\n            if (fromDate < minimumDate) fromDate = minimumDate;\n            if (fromDate > toDate) return [];\n        }\n        var turns = dbContext.Turns.AsNoTracking()")
replace_once(queue, "        var lastSequence = await dbContext.Turns.Where(x => x.BarberShopId == barberShopId && x.QueueDate == today).MaxAsync", "        await planLimitService.EnsureCanCreateTurnAsync(barberShopId, cancellationToken);\n        var lastSequence = await dbContext.Turns.Where(x => x.BarberShopId == barberShopId && x.QueueDate == today).MaxAsync")

# Billing: Free is not a PayPal plan; cancelled/past-due subscriptions fall back to Free without data deletion.
billing = "backend/src/BarberTurn.Infrastructure/Commercial/PayPalBillingService.cs"
replace_once(billing, "        _ = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);\n        ValidateRedirect", "        _ = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);\n        if (request.Plan == SubscriptionPlan.Free)\n            throw new InvalidOperationException(\"Free does not require a PayPal subscription.\");\n        ValidateRedirect")
replace_once(billing, "        return subscription is null\n            ? new SubscriptionResponse(shop.Plan, shop.SubscriptionStatus, \"Trial\", shop.TrialEndsAtUtc, false)\n            : new SubscriptionResponse(subscription.Plan, subscription.Status, subscription.Provider, subscription.PeriodEndsAtUtc, subscription.CancelAtPeriodEnd);", "        return subscription is null || subscription.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing)\n            ? new SubscriptionResponse(SubscriptionPlan.Free, SubscriptionStatus.Active, \"Free\", null, false)\n            : new SubscriptionResponse(subscription.Plan, subscription.Status, subscription.Provider, subscription.PeriodEndsAtUtc, subscription.CancelAtPeriodEnd);")
replace_once(billing, "            shop.ChangeSubscription(shop.Plan, SubscriptionStatus.Cancelled);", "            shop.ChangeSubscription(SubscriptionPlan.Free, SubscriptionStatus.Active);")
replace_once(billing, "        shop.ChangeSubscription(subscription.Plan, subscription.Status);", "        shop.ChangeSubscription(\n            subscription.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing ? subscription.Plan : SubscriptionPlan.Free,\n            subscription.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing ? subscription.Status : SubscriptionStatus.Active);")

# Frontend capability shape and billing usage copy.
types = "frontend/src/portals/admin/commercialTypes.ts"
replace_once(types, "export type Capabilities = { plan: string; status: string; activeBarbers: number; barberLimit: number; activeLocations: number; locationLimit: number; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean; isDemo: boolean; isSystemAdmin: boolean }", "export type Capabilities = { plan: string; status: string; activeBarbers: number; barberLimit: number; activeServices: number; serviceLimit: number; activeLocations: number; locationLimit: number; turnsThisMonth: number; monthlyTurnLimit: number; monthlyTurnGraceLimit: number; historyRetentionDays: number; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean; canUseAdvancedAutomation: boolean; isDemo: boolean; isSystemAdmin: boolean }")

billing_ui = "frontend/src/features/billing/components/BillingSection.tsx"
text = read(billing_ui)
text = text.replace("<><h2>{subscription?.plan ?? capabilities?.plan ?? 'Starter'} · {subscription?.status ?? capabilities?.status ?? 'Trialing'}</h2><p>{capabilities ? `${capabilities.activeBarbers} de ${capabilities.barberLimit > 1000 ? 'ilimitados' : capabilities.barberLimit} barberos activos` : 'Cargando uso…'}</p>{capabilities && <p>{capabilities.activeLocations} de {capabilities.locationLimit > 1000 ? 'ilimitadas' : capabilities.locationLimit} sucursales activas</p>}", "<><h2>{subscription?.plan ?? capabilities?.plan ?? 'Free'} · {subscription?.status ?? capabilities?.status ?? 'Active'}</h2><p>{capabilities ? `${capabilities.activeBarbers} de ${capabilities.barberLimit > 1000 ? 'ilimitados' : capabilities.barberLimit} barberos activos` : 'Cargando uso…'}</p>{capabilities && <p>{capabilities.activeServices} de {capabilities.serviceLimit > 1000 ? 'ilimitados' : capabilities.serviceLimit} servicios activos</p>}{capabilities && <p>{capabilities.monthlyTurnLimit > 1000 ? `${capabilities.turnsThisMonth} turnos este mes · uso ampliado` : `${capabilities.turnsThisMonth} de ${capabilities.monthlyTurnLimit} turnos incluidos este mes${capabilities.turnsThisMonth >= capabilities.monthlyTurnLimit ? ` · tolerancia hasta ${capabilities.monthlyTurnGraceLimit}` : ''}`}</p>}{capabilities && <p>{capabilities.activeLocations} de {capabilities.locationLimit > 1000 ? 'ilimitadas' : capabilities.locationLimit} sucursales activas</p>}")
text = text.replace("{subscription?.provider !== 'Trial' && subscription?.status === 'Active'", "{subscription?.provider !== 'Free' && subscription?.status === 'Active'")
write(billing_ui, text)

# Public pricing now shows the permanent Free tier and the agreed paid progression.
home = "frontend/src/HomePage.tsx"
text = read(home)
start = text.index("const localizedPlans")
end = text.index("\n\nexport default function HomePage")
plans = '''const localizedPlans: Record<Locale, LocalizedPlan[]> = {
  'es-419': [
    { name: 'Free', price: 'US$0', description: 'Para empezar a operar BarberTurn sin tarjeta y probar la cola con clientes reales.', features: ['100 turnos/mes + 10 de tolerancia', 'Hasta 2 barberos', 'Hasta 5 servicios', 'QR y enlace público', 'Notificaciones esenciales', 'Historial de 7 días'] },
    { name: 'Starter', price: 'US$20.00', description: 'Para barberías pequeñas que ya usan BarberTurn todos los días.', features: ['1,000 turnos/mes', 'Hasta 5 barberos', 'Servicios ilimitados', 'Historial de 90 días', 'Cola y métricas operativas'] },
    { name: 'Pro', price: 'US$40.00', description: 'Para automatizar la operación, las citas y la experiencia del cliente.', features: ['Turnos de alto volumen', 'Hasta 10 barberos', 'Citas y reservas online', 'BarberTurn TV', 'CRM y caja', 'Automatizaciones avanzadas'], featured: true },
    { name: 'Business', price: 'US$70.00', description: 'Para operaciones con varias sucursales, analítica y control empresarial.', features: ['Hasta 3 sucursales', 'Barberos ilimitados', 'Todo lo de Pro', 'Reportes avanzados', 'Roles y auditoría avanzada', 'Soporte prioritario'] },
  ],
  en: [
    { name: 'Free', price: 'US$0', description: 'Start operating BarberTurn without a card and try the queue with real customers.', features: ['100 turns/month + 10 grace', 'Up to 2 barbers', 'Up to 5 services', 'Public QR and link', 'Essential notifications', '7-day history'] },
    { name: 'Starter', price: 'US$20.00', description: 'For small barbershops that already use BarberTurn every day.', features: ['1,000 turns/month', 'Up to 5 barbers', 'Unlimited services', '90-day history', 'Queue and operational metrics'] },
    { name: 'Pro', price: 'US$40.00', description: 'Automate operations, appointments and the customer experience.', features: ['High-volume turns', 'Up to 10 barbers', 'Appointments and online booking', 'BarberTurn TV', 'CRM and cash management', 'Advanced automations'], featured: true },
    { name: 'Business', price: 'US$70.00', description: 'For multi-location operations, analytics and enterprise control.', features: ['Up to 3 locations', 'Unlimited barbers', 'Everything in Pro', 'Advanced reports', 'Advanced roles and audit', 'Priority support'] },
  ],
  'es-ES': [
    { name: 'Free', price: 'US$0', description: 'Para empezar a operar BarberTurn sin tarjeta y probar la cola con clientes reales.', features: ['100 turnos/mes + 10 de tolerancia', 'Hasta 2 barberos', 'Hasta 5 servicios', 'QR y enlace público', 'Notificaciones esenciales', 'Historial de 7 días'] },
    { name: 'Starter', price: 'US$20.00', description: 'Para barberías pequeñas que ya utilizan BarberTurn cada día.', features: ['1.000 turnos/mes', 'Hasta 5 barberos', 'Servicios ilimitados', 'Historial de 90 días', 'Cola y métricas operativas'] },
    { name: 'Pro', price: 'US$40.00', description: 'Para automatizar la operación, las citas y la experiencia del cliente.', features: ['Turnos de alto volumen', 'Hasta 10 barberos', 'Citas y reservas online', 'BarberTurn TV', 'CRM y caja', 'Automatizaciones avanzadas'], featured: true },
    { name: 'Business', price: 'US$70.00', description: 'Para negocios con varios locales, analítica y control empresarial.', features: ['Hasta 3 locales', 'Barberos ilimitados', 'Todo lo de Pro', 'Informes avanzados', 'Roles y auditoría avanzada', 'Soporte prioritario'] },
  ],
}'''
write(home, text[:start] + plans + text[end:])

# Four plan cards on desktop.
home_css = "frontend/src/home.css"
replace_once(home_css, ".pricing-grid { width: min(1080px, 100%); margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr);", ".pricing-grid { width: min(1280px, 100%); margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr);")

# Remove obsolete trial wording in all locales.
for path, old, new in [
    ("frontend/src/i18n/es-419/common.ts", '"home.contact.cardNote": "Sin tarjeta para comenzar la etapa de prueba."', '"home.contact.cardNote": "Sin tarjeta para comenzar con Free."'),
    ("frontend/src/i18n/en/common.ts", '"home.contact.cardNote": "No card required to start the trial stage."', '"home.contact.cardNote": "No card required to start on Free."'),
    ("frontend/src/i18n/es-ES/common.ts", '"home.contact.cardNote": "Sin tarjeta para comenzar la etapa de prueba."', '"home.contact.cardNote": "Sin tarjeta para comenzar con Free."'),
]:
    replace_once(path, old, new)

# Commercial documentation and README matrix.
readme = "README.md"
text = read(readme)
text = text.replace("- 💳 planes Starter / Pro / Business;", "- 💳 planes Free / Starter / Pro / Business;")
old_table = '''| Capacidad | Starter | Pro | Business |
|---|:---:|:---:|:---:|
| Cola por llegada | ✅ | ✅ | ✅ |
| Gestión básica de barberos/servicios | ✅ | ✅ | ✅ |
| Citas | ❌ | ✅ | ✅ |
| BarberTurn TV | ❌ | ✅ | ✅ |
| Reportes avanzados | ❌ | ❌ | ✅ |
| Suscripción y límites de uso | ✅ | ✅ | ✅ |

Las reglas comerciales pueden evolucionar antes de la salida pública; el backend es la fuente de verdad para entitlements.'''
new_table = '''| Capacidad | Free | Starter | Pro | Business |
|---|:---:|:---:|:---:|:---:|
| Cola por llegada | ✅ 100/mes (+10 tolerancia) | ✅ 1,000/mes | ✅ alto volumen | ✅ alto volumen |
| Barberos activos | 2 | 5 | 10 | Ilimitados |
| Servicios activos | 5 | Ilimitados | Ilimitados | Ilimitados |
| Historial de turnos | 7 días | 90 días | Completo | Completo |
| Notificaciones esenciales | ✅ | ✅ | ✅ | ✅ |
| Citas | ❌ | ❌ | ✅ | ✅ |
| BarberTurn TV | ❌ | ❌ | ✅ | ✅ |
| Automatizaciones avanzadas | ❌ | ❌ | ✅ | ✅ |
| Reportes avanzados | ❌ | ❌ | ❌ | ✅ |
| Multi-location | 1 | 1 | 1 | Hasta 3 |

Free es el piso permanente: cancelar o perder una suscripción no elimina datos ni bloquea seguridad, identidad, notificaciones esenciales o turnos existentes. El backend es la fuente de verdad para entitlements. Consulta [`docs/plans-and-entitlements.md`](docs/plans-and-entitlements.md).'''
if old_table not in text:
    raise RuntimeError("README plan table not found")
write(readme, text.replace(old_table, new_table, 1))

doc = '''# BarberTurn plans and entitlements

This document is the commercial source of truth for plan behavior. Server-side entitlements remain authoritative.

## Principles

- Free is a permanent operating tier, not an expiring trial.
- Customers and independent barber identity/onboarding are not subscription-gated.
- Essential push notifications stay available on Free; paid plans monetize advanced automation, not critical communication.
- Existing turns and data are never deleted because a subscription expires or is cancelled.
- Monthly turn limits gate only creation of new turns after the grace allowance; existing turns can still be viewed, called, completed or cancelled.
- Public QR/link access stays on Free because it is part of BarberTurn's acquisition loop.

## Entitlements

| Entitlement | Free | Starter | Pro | Business |
|---|---:|---:|---:|---:|
| Monthly turns included | 100 | 1,000 | High volume | High volume |
| Hard grace threshold | 110 | 1,050 | Fair use | Fair use |
| Active barbers | 2 | 5 | 10 | Unlimited |
| Active services | 5 | Unlimited | Unlimited | Unlimited |
| Active locations | 1 | 1 | 1 | 3 |
| Queue history | 7 days | 90 days | Full | Full |
| Essential push notifications | Yes | Yes | Yes | Yes |
| Appointments | No | No | Yes | Yes |
| BarberTurn TV | No | No | Yes | Yes |
| Advanced automation | No | No | Yes | Yes |
| Advanced reports | No | No | No | Yes |

## Downgrade behavior

When a paid subscription is cancelled, suspended or becomes past due, the effective tenant plan falls back to Free. Paid subscription records remain available for billing history, but BarberTurn keeps the tenant operational under Free limits.

If current usage is above a Free resource limit, existing records remain intact. Limits are enforced when creating additional resources. This avoids destructive downgrades.

## Notifications

Essential notifications are part of the safe baseline and are never paywalled. Examples include turn state changes, "your turn is approaching", cancellation, onboarding approval and security/account events.

Advanced scheduled reminders, multi-step appointment automation, no-show workflows and future campaigns belong to Pro/Business.
'''
Path("docs/plans-and-entitlements.md").write_text(doc, encoding="utf-8")

# Changelog.
changelog = "CHANGELOG.md"
text = read(changelog)
header = "## Unreleased - Free plan and turn quotas\n\n- Added a permanent Free tier with 100 monthly turns plus a 10-turn grace allowance, 2 active barbers, 5 active services and 7-day queue history.\n- Starter now supports 1,000 monthly turns, 5 active barbers and 90-day history; Pro owns appointments/TV/advanced automation; Business owns advanced reports and multi-location.\n- Essential mobile push notifications remain available on Free. Cancelling or losing a paid subscription now falls back to Free instead of disabling the tenant.\n\n"
write(changelog, header + text)

# Integration coverage for the new baseline.
test = r'''using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class FreePlanEntitlementTests
{
    private readonly BarberTurnFactory factory;

    public FreePlanEntitlementTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task NewOwnerStartsOnPermanentFreeEntitlements()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var response = await client.GetAsync("/api/capabilities");
        response.EnsureSuccessStatusCode();
        var usage = await response.Content.ReadFromJsonAsync<UsagePayload>();

        Assert.NotNull(usage);
        Assert.Equal("Free", usage.Plan);
        Assert.Equal("Active", usage.Status);
        Assert.Equal(2, usage.BarberLimit);
        Assert.Equal(5, usage.ServiceLimit);
        Assert.Equal(1, usage.LocationLimit);
        Assert.Equal(100, usage.MonthlyTurnLimit);
        Assert.Equal(110, usage.MonthlyTurnGraceLimit);
        Assert.Equal(7, usage.HistoryRetentionDays);
        Assert.False(usage.CanUseAppointments);
        Assert.False(usage.CanUseTv);
        Assert.False(usage.CanUseAdvancedReports);
        Assert.False(usage.CanUseAdvancedAutomation);
    }

    [Fact]
    public async Task FreeServiceLimitIsEnforcedServerSide()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        for (var index = 1; index <= 5; index++)
        {
            var created = await client.PostAsJsonAsync("/api/queue/services", new { name = $"Service {index}", price = 10m, estimatedDurationMinutes = 30, description = (string?)null });
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }

        var rejected = await client.PostAsJsonAsync("/api/queue/services", new { name = "Service 6", price = 10m, estimatedDurationMinutes = 30, description = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
    }

    [Fact]
    public async Task FreeTurnGraceThresholdBlocksOnlyNewTurns()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var serviceResponse = await client.PostAsJsonAsync("/api/queue/services", new { name = "Cut", price = 20m, estimatedDurationMinutes = 30, description = (string?)null });
        serviceResponse.EnsureSuccessStatusCode();
        var service = await serviceResponse.Content.ReadFromJsonAsync<ServicePayload>();
        Assert.NotNull(service);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var shop = await db.BarberShops.SingleAsync(x => x.Slug == auth.Slug);
            var tz = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId);
            var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz);
            var today = new DateOnly(localNow.Year, localNow.Month, localNow.Day);
            for (var index = 1; index <= 110; index++)
                db.Turns.Add(new Turn(shop.Id, service.Id, today, index, $"Customer {index}"));
            await db.SaveChangesAsync();
        }

        var rejected = await client.PostAsJsonAsync("/api/queue/turns", new { serviceId = service.Id, customerName = "Blocked customer", barberId = (Guid?)null, customerPhone = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

        var queue = await client.GetAsync("/api/queue/turns");
        queue.EnsureSuccessStatusCode();
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task<AuthPayload> RegisterOwnerAsync(HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N")[..10];
        var slug = $"free-plan-{suffix}";
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Free Plan {suffix}",
            barberShopSlug = slug,
            name = $"Owner {suffix}",
            email = $"free-plan-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        return auth with { Slug = slug };
    }

    private sealed record AuthPayload(string AccessToken, string? Slug = null);
    private sealed record ServicePayload(Guid Id);
    private sealed record UsagePayload(
        string Plan,
        string Status,
        int BarberLimit,
        int ServiceLimit,
        int LocationLimit,
        int MonthlyTurnLimit,
        int MonthlyTurnGraceLimit,
        int HistoryRetentionDays,
        bool CanUseAppointments,
        bool CanUseTv,
        bool CanUseAdvancedReports,
        bool CanUseAdvancedAutomation);
}
'''
Path("backend/tests/BarberTurn.Api.Tests/FreePlanEntitlementTests.cs").write_text(test, encoding="utf-8")

# Temporary files must not survive the generated product commit.
Path(".github/scripts/free_plan_patch.py").unlink(missing_ok=True)
Path(".github/workflows/free-plan-bootstrap.yml").unlink(missing_ok=True)
