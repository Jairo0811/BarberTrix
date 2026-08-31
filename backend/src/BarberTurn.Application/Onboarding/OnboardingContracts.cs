using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Onboarding;

public sealed record BarberShopDirectoryItem(Guid Id, string Name, string Slug, string TimeZoneId);
public sealed record BarberJoinRequestResponse(
    Guid Id,
    Guid BarberShopId,
    string BarberShopName,
    BarberJoinRequestStatus Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ReviewedAtUtc,
    string? ReviewNote);
public sealed record TeamBarberJoinRequestResponse(
    Guid Id,
    Guid UserId,
    string BarberName,
    string Email,
    DateTimeOffset CreatedAtUtc);
public sealed record ApproveBarberJoinRequestRequest(int ChairNumber);
public sealed record RejectBarberJoinRequestRequest(string? Note);

public interface IBarberOnboardingService
{
    Task<IReadOnlyList<BarberShopDirectoryItem>> SearchShopsAsync(string? query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BarberJoinRequestResponse>> GetMyJoinRequestsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<BarberJoinRequestResponse> RequestJoinAsync(Guid userId, Guid barberShopId, CancellationToken cancellationToken = default);
    Task<bool> WithdrawJoinRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeamBarberJoinRequestResponse>> GetPendingJoinRequestsAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<bool> ApproveJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, int chairNumber, CancellationToken cancellationToken = default);
    Task<bool> RejectJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, string? note, CancellationToken cancellationToken = default);
}
