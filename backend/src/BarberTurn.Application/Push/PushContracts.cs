using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Push;

public sealed record RegisterPushSubscriptionRequest(
    Guid InstallationId,
    string ExpoPushToken,
    PushPlatform Platform);

public interface IPushSubscriptionService
{
    Task RegisterStaffAsync(
        Guid barberShopId,
        Guid userId,
        RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> UnregisterStaffAsync(
        Guid barberShopId,
        Guid userId,
        Guid installationId,
        CancellationToken cancellationToken = default);

    Task<bool> RegisterPublicAsync(
        string shopSlug,
        Guid turnRequestId,
        string lookupToken,
        RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> UnregisterPublicAsync(
        string shopSlug,
        Guid turnRequestId,
        string lookupToken,
        Guid installationId,
        CancellationToken cancellationToken = default);
}

public enum TurnRequestPushEvent
{
    Created,
    Accepted,
    Rejected,
    CounterProposed,
    Cancelled,
    CounterAccepted
}

public interface ITurnRequestPushNotifier
{
    Task QueueForStaffAsync(
        Guid barberShopId,
        Guid barberId,
        Guid turnRequestId,
        TurnRequestPushEvent pushEvent,
        CancellationToken cancellationToken = default);

    Task QueueForCustomerAsync(
        Guid turnRequestId,
        TurnRequestPushEvent pushEvent,
        CancellationToken cancellationToken = default);
}
