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

internal sealed class PlanLimitService(ApplicationDbContext dbContext) : IPlanLimitService
{
    public async Task EnsureCanAddBarberAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        if (usage.ActiveBarbers >= usage.BarberLimit)
            throw new InvalidOperationException($"The {usage.Plan} plan allows up to {usage.BarberLimit} active barbers.");
    }

    public async Task<PlanUsageResponse> GetUsageAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var shop = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);
        var activeBarbers = await dbContext.Barbers.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive, cancellationToken);
        var activeLocations = await dbContext.ShopLocations.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive, cancellationToken);
        var status = shop.SubscriptionStatus == SubscriptionStatus.Trialing && shop.TrialEndsAtUtc <= DateTimeOffset.UtcNow ? SubscriptionStatus.PastDue : shop.SubscriptionStatus;
        var entitled = status is SubscriptionStatus.Active or SubscriptionStatus.Trialing;
        var limit = entitled ? shop.Plan switch { SubscriptionPlan.Starter => 3, SubscriptionPlan.Pro => 10, _ => int.MaxValue } : 0;
        var locationLimit = shop.Plan == SubscriptionPlan.Business ? 3 : 1;
        return new PlanUsageResponse(shop.Plan, status, activeBarbers, limit, activeLocations, entitled ? locationLimit : 0,
            entitled && (shop.Plan is SubscriptionPlan.Pro or SubscriptionPlan.Business),
            entitled && (shop.Plan is SubscriptionPlan.Pro or SubscriptionPlan.Business),
            entitled && shop.Plan == SubscriptionPlan.Business);
    }

    public async Task EnsureCanAddLocationAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var usage = await GetUsageAsync(barberShopId, cancellationToken);
        if (usage.ActiveLocations >= usage.LocationLimit)
            throw new InvalidOperationException($"The {usage.Plan} plan allows up to {usage.LocationLimit} active locations.");
    }
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
