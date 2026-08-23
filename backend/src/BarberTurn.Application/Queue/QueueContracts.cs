using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Queue;

public sealed record CreateBarberRequest(string Name, int ChairNumber);
public sealed record ChangeBarberStatusRequest(BarberStatus Status);
public sealed record BarberResponse(Guid Id, string Name, int ChairNumber, BarberStatus Status, bool IsActive);

public sealed record CreateServiceRequest(string Name, decimal Price, int EstimatedDurationMinutes, string? Description);
public sealed record ServiceResponse(Guid Id, string Name, string? Description, decimal Price, int EstimatedDurationMinutes, bool IsActive);

public sealed record CreateTurnRequest(Guid ServiceId, string? CustomerName, Guid? BarberId);
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

public interface IQueueService
{
    Task<IReadOnlyList<BarberResponse>> GetBarbersAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<BarberResponse> CreateBarberAsync(Guid barberShopId, CreateBarberRequest request, CancellationToken cancellationToken = default);
    Task<BarberResponse?> ChangeBarberStatusAsync(Guid barberShopId, Guid barberId, ChangeBarberStatusRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ServiceResponse>> GetServicesAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<ServiceResponse> CreateServiceAsync(Guid barberShopId, CreateServiceRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TurnResponse>> GetQueueAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<TurnResponse> CreateTurnAsync(Guid barberShopId, CreateTurnRequest request, CancellationToken cancellationToken = default);
    Task<TurnResponse?> CallTurnAsync(Guid barberShopId, Guid turnId, Guid barberId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> StartTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> CompleteTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> CancelTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
    Task<TurnResponse?> MarkNoShowAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default);
}
