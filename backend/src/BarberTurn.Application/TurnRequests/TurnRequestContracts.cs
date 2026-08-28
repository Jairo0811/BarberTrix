using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.TurnRequests;

public sealed record CreateTurnRequestRequest(
    Guid ServiceId,
    Guid BarberId,
    DateTimeOffset RequestedStartsAt,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    string? Notes);

public sealed record CounterProposeTurnRequestRequest(DateTimeOffset StartsAt);

public sealed record TurnRequestResponse(
    Guid Id,
    Guid ServiceId,
    string ServiceName,
    Guid BarberId,
    string BarberName,
    DateTimeOffset RequestedStartsAtUtc,
    DateTimeOffset? CounterProposedStartsAtUtc,
    DateTimeOffset EffectiveStartsAtUtc,
    string CustomerName,
    string? CustomerPhone,
    string? CustomerEmail,
    string? Notes,
    TurnRequestStatus Status,
    DateTimeOffset ExpiresAtUtc,
    DateTimeOffset? RespondedAtUtc,
    Guid? AppointmentId,
    DateTimeOffset CreatedAtUtc);

public sealed record PublicTurnRequestResponse(TurnRequestResponse Request, string LookupToken);

public interface ITurnRequestService
{
    Task<IReadOnlyList<TurnRequestResponse>> GetForStaffAsync(Guid barberShopId, Guid? barberId, CancellationToken cancellationToken = default);
    Task<TurnRequestResponse?> GetAsync(Guid barberShopId, Guid requestId, CancellationToken cancellationToken = default);
    Task<PublicTurnRequestResponse> CreatePublicAsync(string shopSlug, CreateTurnRequestRequest request, CancellationToken cancellationToken = default);
    Task<TurnRequestResponse?> GetPublicAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken = default);
    Task<bool> CancelPublicAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken = default);
    Task<TurnRequestResponse?> AcceptCounterPublicAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken = default);
    Task<TurnRequestResponse?> AcceptAsync(Guid barberShopId, Guid requestId, CancellationToken cancellationToken = default);
    Task<TurnRequestResponse?> RejectAsync(Guid barberShopId, Guid requestId, CancellationToken cancellationToken = default);
    Task<TurnRequestResponse?> CounterProposeAsync(Guid barberShopId, Guid requestId, CounterProposeTurnRequestRequest request, CancellationToken cancellationToken = default);
}
