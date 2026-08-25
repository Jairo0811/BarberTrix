using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Queue;

public sealed record CreateBarberRequest(string Name, int ChairNumber);
public sealed record UpdateBarberRequest(string Name, int ChairNumber, bool IsActive);
public sealed record ChangeBarberStatusRequest(BarberStatus Status);
public sealed record BarberResponse(Guid Id, string Name, int ChairNumber, BarberStatus Status, bool IsActive);

public sealed record CreateServiceRequest(string Name, decimal Price, int EstimatedDurationMinutes, string? Description);
public sealed record UpdateServiceRequest(string Name, decimal Price, int EstimatedDurationMinutes, string? Description, bool IsActive);
public sealed record ServiceResponse(Guid Id, string Name, string? Description, decimal Price, int EstimatedDurationMinutes, bool IsActive);

public sealed record CreateTurnRequest(
    Guid ServiceId,
    string? CustomerName,
    Guid? BarberId,
    string? CustomerPhone = null,
    string? IdempotencyKey = null,
    Guid? AppointmentId = null);
public sealed record TurnResponse(
    Guid Id,
    string TicketNumber,
    string? CustomerName,
    TurnStatus Status,
    Guid ServiceId,
    string ServiceName,
    Guid? BarberId,
    string? BarberName,
    int? ChairNumber,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? CalledAtUtc,
    DateTimeOffset? ServiceStartedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record QueueMetricsResponse(
    int Waiting,
    int Called,
    int InService,
    int CompletedToday,
    int CancelledToday,
    int NoShowToday,
    int AvailableBarbers,
    int EstimatedWaitMinutes);

public sealed record PublicShopResponse(Guid Id, string Name, string Slug, string TimeZoneId, IReadOnlyList<ServiceResponse> Services, IReadOnlyList<BarberResponse> Barbers);
public sealed record PublicCreateTurnRequest(Guid ServiceId, string? CustomerName, string? CustomerPhone, Guid? BarberId, string? IdempotencyKey);
public sealed record PublicTurnResponse(TurnResponse Turn, string LookupToken, int Position, int EstimatedWaitMinutes);
public sealed record PublicTurnStatusResponse(TurnResponse Turn, int Position, int EstimatedWaitMinutes);
public sealed record PublicQueueItemResponse(string TicketNumber, TurnStatus Status, string? BarberName, int? ChairNumber);
public sealed record PublicQueueDisplayResponse(string ShopName, IReadOnlyList<PublicQueueItemResponse> Turns, int EstimatedWaitMinutes, DateTimeOffset UpdatedAtUtc);

public interface IQueueService
{
    Task<IReadOnlyList<BarberResponse>> GetBarbersAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<BarberResponse> CreateBarberAsync(Guid barberShopId, CreateBarberRequest request, CancellationToken cancellationToken = default);
    Task<BarberResponse?> UpdateBarberAsync(Guid barberShopId, Guid barberId, UpdateBarberRequest request, CancellationToken cancellationToken = default);
    Task<BarberResponse?> ChangeBarberStatusAsync(Guid barberShopId, Guid barberId, ChangeBarberStatusRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ServiceResponse>> GetServicesAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<ServiceResponse> CreateServiceAsync(Guid barberShopId, CreateServiceRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResponse?> UpdateServiceAsync(Guid barberShopId, Guid serviceId, UpdateServiceRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TurnResponse>> GetQueueAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TurnResponse>> GetHistoryAsync(Guid barberShopId, DateOnly from, DateOnly to, int take, CancellationToken cancellationToken = default);
    Task<QueueMetricsResponse> GetMetricsAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<TurnResponse> CreateTurnAsync(Guid barberShopId, CreateTurnRequest request, CancellationToken cancellationToken = default);
    Task<TurnResponse?> CallTurnAsync(Guid barberShopId, Guid turnId, Guid barberId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> StartTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> CompleteTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> CancelTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> MarkNoShowAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);

    Task<PublicShopResponse?> GetPublicShopAsync(string slug, CancellationToken cancellationToken = default);
    Task<PublicTurnResponse> CreatePublicTurnAsync(string slug, PublicCreateTurnRequest request, CancellationToken cancellationToken = default);
    Task<PublicQueueDisplayResponse?> GetPublicQueueAsync(string slug, CancellationToken cancellationToken = default);
    Task<PublicTurnStatusResponse?> GetPublicTurnAsync(string slug, Guid turnId, string lookupToken, CancellationToken cancellationToken = default);
    Task<bool> CancelPublicTurnAsync(string slug, Guid turnId, string lookupToken, CancellationToken cancellationToken = default);
}
