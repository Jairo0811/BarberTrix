using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Common;

public interface IEmailSender
{
    Task SendAsync(string recipient, string subject, string htmlBody, CancellationToken cancellationToken = default);
}

public interface IHumanVerificationService
{
    Task<bool> VerifyAsync(string? token, string? ipAddress, CancellationToken cancellationToken = default);
}

public interface IAuditService
{
    Task WriteAsync(Guid barberShopId, Guid? userId, string action, string resourceType, string? resourceId = null, string? metadata = null, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuditLogResponse>> GetAsync(Guid barberShopId, int take, CancellationToken cancellationToken = default);
}

public sealed record AuditLogResponse(Guid Id, Guid? UserId, string Action, string ResourceType, string? ResourceId, string? Metadata, string? IpAddress, DateTimeOffset CreatedAtUtc);

public enum PlanFeature
{
    Appointments,
    Tv,
    AdvancedReports
}

public interface IPlanLimitService
{
    Task EnsureCanAddBarberAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task EnsureCanAddLocationAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task EnsureCanUseAsync(Guid barberShopId, PlanFeature feature, CancellationToken cancellationToken = default);
    Task<PlanUsageResponse> GetUsageAsync(Guid barberShopId, CancellationToken cancellationToken = default);
}

public sealed record PlanUsageResponse(
    SubscriptionPlan Plan,
    SubscriptionStatus Status,
    int ActiveBarbers,
    int BarberLimit,
    int ActiveLocations,
    int LocationLimit,
    bool CanUseAppointments,
    bool CanUseTv,
    bool CanUseAdvancedReports,
    bool IsDemo);

public interface IShopLookupService
{
    Task<Guid?> GetActiveShopIdBySlugAsync(string slug, CancellationToken cancellationToken = default);
}

public interface IQueueNotifier
{
    Task QueueChangedAsync(Guid barberShopId, string eventName, CancellationToken cancellationToken = default);
}
