namespace BarberTrix.Application.Discovery;

public sealed record DiscoveryShopCard(
    Guid Id,
    string Name,
    string Slug,
    string? LocationName,
    string? Address,
    int WaitingCount,
    int InServiceCount,
    int ActiveBarbers,
    int AvailableBarbers,
    decimal? StartingPrice,
    int? EstimatedWaitMinutes);

public interface IDiscoveryService
{
    Task<IReadOnlyList<DiscoveryShopCard>> SearchAsync(string? query, int limit, CancellationToken cancellationToken);
}
