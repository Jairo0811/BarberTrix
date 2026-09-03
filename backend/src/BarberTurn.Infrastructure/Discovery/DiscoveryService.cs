using BarberTurn.Application.Discovery;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Discovery;

public sealed class DiscoveryService(ApplicationDbContext db) : IDiscoveryService
{
    private const int DefaultServiceDurationMinutes = 30;

    public async Task<IReadOnlyList<DiscoveryShopCard>> SearchAsync(
        string? query,
        int limit,
        CancellationToken cancellationToken)
    {
        limit = Math.Clamp(limit, 1, 50);
        var normalizedQuery = string.IsNullOrWhiteSpace(query) ? null : query.Trim();

        var shopsQuery = db.BarberShops.AsNoTracking().Where(x => x.IsActive);
        if (normalizedQuery is not null)
            shopsQuery = shopsQuery.Where(x => x.Name.Contains(normalizedQuery) || x.Slug.Contains(normalizedQuery));

        var shops = await shopsQuery
            .OrderBy(x => x.Name)
            .Take(limit)
            .Select(x => new { x.Id, x.Name, x.Slug, x.TimeZoneId })
            .ToListAsync(cancellationToken);

        if (shops.Count == 0)
            return Array.Empty<DiscoveryShopCard>();

        var shopIds = shops.Select(x => x.Id).ToArray();

        var locations = await db.ShopLocations.AsNoTracking()
            .Where(x => shopIds.Contains(x.BarberShopId) && x.IsActive)
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new { x.BarberShopId, x.Name, x.Address })
            .ToListAsync(cancellationToken);

        var barberStats = await db.Barbers.AsNoTracking()
            .Where(x => shopIds.Contains(x.BarberShopId) && x.IsActive)
            .GroupBy(x => x.BarberShopId)
            .Select(group => new
            {
                ShopId = group.Key,
                Active = group.Count(),
                Available = group.Count(x => x.Status == BarberStatus.Available)
            })
            .ToDictionaryAsync(x => x.ShopId, cancellationToken);

        var serviceStats = await db.BarberServices.AsNoTracking()
            .Where(x => shopIds.Contains(x.BarberShopId) && x.IsActive)
            .GroupBy(x => x.BarberShopId)
            .Select(group => new
            {
                ShopId = group.Key,
                StartingPrice = (decimal?)group.Min(x => x.Price),
                AverageDuration = (double?)group.Average(x => x.EstimatedDurationMinutes)
            })
            .ToDictionaryAsync(x => x.ShopId, cancellationToken);

        var queueWindowStart = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        var queueWindowEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var turns = await db.Turns.AsNoTracking()
            .Where(x => shopIds.Contains(x.BarberShopId)
                && x.QueueDate >= queueWindowStart
                && x.QueueDate <= queueWindowEnd
                && (x.Status == TurnStatus.Waiting || x.Status == TurnStatus.InService))
            .Select(x => new { x.BarberShopId, x.QueueDate, x.Status })
            .ToListAsync(cancellationToken);

        var result = new List<DiscoveryShopCard>(shops.Count);
        foreach (var shop in shops)
        {
            var localDate = GetLocalDate(shop.TimeZoneId);
            var waiting = turns.Count(x => x.BarberShopId == shop.Id && x.QueueDate == localDate && x.Status == TurnStatus.Waiting);
            var inService = turns.Count(x => x.BarberShopId == shop.Id && x.QueueDate == localDate && x.Status == TurnStatus.InService);

            barberStats.TryGetValue(shop.Id, out var barbers);
            serviceStats.TryGetValue(shop.Id, out var services);
            var location = locations.FirstOrDefault(x => x.BarberShopId == shop.Id);

            var activeBarbers = barbers?.Active ?? 0;
            var availableBarbers = barbers?.Available ?? 0;
            var capacity = Math.Max(availableBarbers, activeBarbers > 0 ? 1 : 0);
            var averageDuration = services?.AverageDuration ?? DefaultServiceDurationMinutes;
            var estimatedWait = capacity == 0
                ? null
                : (int?)Math.Ceiling(waiting * averageDuration / capacity);

            result.Add(new DiscoveryShopCard(
                shop.Id,
                shop.Name,
                shop.Slug,
                location?.Name,
                location?.Address,
                waiting,
                inService,
                activeBarbers,
                availableBarbers,
                services?.StartingPrice,
                estimatedWait));
        }

        return result
            .OrderBy(x => x.EstimatedWaitMinutes ?? int.MaxValue)
            .ThenBy(x => x.WaitingCount)
            .ThenBy(x => x.Name)
            .ToArray();
    }

    private static DateOnly GetLocalDate(string timeZoneId)
    {
        try
        {
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone).DateTime);
        }
        catch (TimeZoneNotFoundException)
        {
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
        catch (InvalidTimeZoneException)
        {
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
    }
}
