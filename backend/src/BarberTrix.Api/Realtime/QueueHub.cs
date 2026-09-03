using BarberTrix.Application.Common;
using BarberTrix.Application.Tv;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Api.Realtime;

public sealed class QueueHub(ApplicationDbContext dbContext, ITvDisplayService tvDisplayService) : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (Guid.TryParse(Context.User?.FindFirst("barbershop_id")?.Value, out var shopId))
            await Groups.AddToGroupAsync(Context.ConnectionId, InternalGroup(shopId));
        await base.OnConnectedAsync();
    }

    public Task<bool> JoinPublicShop(string slug) => JoinBySlugAsync(slug, PublicGroup);

    public async Task<bool> JoinTvDisplay(string displayToken)
    {
        var session = await tvDisplayService.ResolveSessionAsync(displayToken, Context.ConnectionAborted);
        if (session is null)
            return false;
        await Groups.AddToGroupAsync(Context.ConnectionId, TvGroup(session.BarberShopId));
        return true;
    }

    private async Task<bool> JoinBySlugAsync(string slug, Func<Guid, string> groupFactory)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var shopId = await dbContext.BarberShops.AsNoTracking()
            .Where(x => x.Slug == normalizedSlug && x.IsActive)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync();
        if (shopId is null)
            return false;
        await Groups.AddToGroupAsync(Context.ConnectionId, groupFactory(shopId.Value));
        return true;
    }

    internal static string InternalGroup(Guid shopId) => $"shop:{shopId:N}:internal";
    internal static string PublicGroup(Guid shopId) => $"shop:{shopId:N}:public";
    internal static string TvGroup(Guid shopId) => $"shop:{shopId:N}:tv";
}

public sealed class SignalRQueueNotifier(IHubContext<QueueHub> hubContext) : IQueueNotifier
{
    public Task QueueChangedAsync(Guid barberShopId, string eventName, CancellationToken cancellationToken = default)
    {
        var payload = new { eventName, occurredAtUtc = DateTimeOffset.UtcNow };
        return Task.WhenAll(
            hubContext.Clients.Group(QueueHub.InternalGroup(barberShopId)).SendAsync("queueChanged", payload, cancellationToken),
            hubContext.Clients.Group(QueueHub.PublicGroup(barberShopId)).SendAsync("queueChanged", payload, cancellationToken),
            hubContext.Clients.Group(QueueHub.TvGroup(barberShopId)).SendAsync("queueChanged", payload, cancellationToken));
    }
}
