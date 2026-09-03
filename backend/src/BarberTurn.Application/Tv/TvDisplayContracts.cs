using BarberTurn.Application.Queue;

namespace BarberTurn.Application.Tv;

public sealed record CreateTvDisplayRequest(string Name);
public sealed record PairTvDisplayRequest(string Code);

public sealed record TvDisplayResponse(
    Guid Id,
    string Name,
    bool IsActive,
    bool IsPaired,
    DateTimeOffset? PairedAtUtc,
    DateTimeOffset? LastSeenAtUtc,
    DateTimeOffset? PairingExpiresAtUtc);

public sealed record TvPairingCodeResponse(Guid DisplayId, string Code, DateTimeOffset ExpiresAtUtc);
public sealed record PairTvDisplayResponse(string DisplayToken, Guid DisplayId, string DisplayName, string ShopName);
public sealed record TvDisplaySnapshotResponse(Guid DisplayId, string DisplayName, string ShopName, string ShopSlug, PublicQueueDisplayResponse Queue);
public sealed record TvDisplaySession(Guid DisplayId, Guid BarberShopId, string ShopSlug);

public interface ITvDisplayService
{
    Task<IReadOnlyList<TvDisplayResponse>> ListAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<(TvDisplayResponse Display, TvPairingCodeResponse Pairing)> CreateAsync(Guid barberShopId, CreateTvDisplayRequest request, CancellationToken cancellationToken = default);
    Task<TvPairingCodeResponse?> IssuePairingCodeAsync(Guid barberShopId, Guid displayId, CancellationToken cancellationToken = default);
    Task<bool> RevokeAsync(Guid barberShopId, Guid displayId, CancellationToken cancellationToken = default);
    Task<PairTvDisplayResponse?> PairAsync(string code, CancellationToken cancellationToken = default);
    Task<TvDisplaySnapshotResponse?> GetSnapshotAsync(string displayToken, CancellationToken cancellationToken = default);
    Task<TvDisplaySession?> ResolveSessionAsync(string displayToken, CancellationToken cancellationToken = default);
}
