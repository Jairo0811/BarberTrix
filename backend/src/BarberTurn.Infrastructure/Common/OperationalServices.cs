using System.Net;
using System.Net.Http.Json;
using System.Net.Mail;
using BarberTurn.Application.Common;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BarberTurn.Infrastructure.Common;

internal sealed class ShopLookupService(ApplicationDbContext dbContext) : IShopLookupService
{
    public async Task<Guid?> GetActiveShopIdBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        return await dbContext.BarberShops.AsNoTracking()
            .Where(shop => shop.Slug == normalized && shop.IsActive)
            .Select(shop => (Guid?)shop.Id)
            .SingleOrDefaultAsync(cancellationToken);
    }
}

internal sealed class PlanLimitService(ApplicationDbContext dbContext, IConfiguration configuration) : IPlanLimitService
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
        var paidEntitlement = (rawStatus is SubscriptionStatus.Active or SubscriptionStatus.Trialing) && shop.Plan != SubscriptionPlan.Free;
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
            SubscriptionPlan.Free => 3,
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

internal sealed class AuditService(ApplicationDbContext dbContext) : IAuditService
{
    public async Task WriteAsync(Guid barberShopId, Guid? userId, string action, string resourceType, string? resourceId = null, string? metadata = null, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        dbContext.AuditLogs.Add(new AuditLog(barberShopId, userId, action, resourceType, resourceId, metadata, ipAddress));
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLogResponse>> GetAsync(Guid barberShopId, int take, CancellationToken cancellationToken = default) =>
        await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(Math.Clamp(take, 1, 500))
            .Select(x => new AuditLogResponse(x.Id, x.UserId, x.Action, x.ResourceType, x.ResourceId, x.Metadata, x.IpAddress, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
}

internal sealed class HumanVerificationService(HttpClient httpClient, IConfiguration configuration) : IHumanVerificationService
{
    public async Task<bool> VerifyAsync(string? token, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (!configuration.GetValue<bool>("HumanVerification:Enabled"))
            return true;
        var secret = configuration["HumanVerification:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(token))
            return false;
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = secret,
            ["response"] = token,
            ["remoteip"] = ipAddress ?? string.Empty
        });
        using var response = await httpClient.PostAsync("https://challenges.cloudflare.com/turnstile/v0/siteverify", content, cancellationToken);
        var payload = await response.Content.ReadFromJsonAsync<TurnstileResponse>(cancellationToken: cancellationToken);
        return response.IsSuccessStatusCode && payload?.Success == true;
    }

    private sealed record TurnstileResponse(bool Success);
}

internal sealed class ConfigurableEmailSender(IConfiguration configuration, ILogger<ConfigurableEmailSender> logger) : IEmailSender
{
    private static readonly Action<ILogger, string, string, Exception?> LogDisabledEmail =
        LoggerMessage.Define<string, string>(LogLevel.Information, new EventId(1001, "TransactionalEmailDisabled"), "Transactional email disabled. Subject {Subject} intended for {Recipient}.");

    public async Task SendAsync(string recipient, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (!configuration.GetValue<bool>("Email:Enabled"))
        {
            LogDisabledEmail(logger, subject, recipient, null);
            return;
        }

        var host = configuration["Email:Smtp:Host"] ?? throw new InvalidOperationException("Email:Smtp:Host is not configured.");
        var from = configuration["Email:From"] ?? throw new InvalidOperationException("Email:From is not configured.");
        using var message = new MailMessage(from, recipient, subject, htmlBody) { IsBodyHtml = true };
        using var client = new SmtpClient(host, configuration.GetValue("Email:Smtp:Port", 587))
        {
            EnableSsl = configuration.GetValue("Email:Smtp:UseTls", true),
            Credentials = new NetworkCredential(configuration["Email:Smtp:Username"], configuration["Email:Smtp:Password"])
        };
        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message, cancellationToken);
    }
}
