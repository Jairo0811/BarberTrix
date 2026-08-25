using BarberTurn.Application.Common;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Api.Realtime;

public sealed class QueueHub(ApplicationDbContext dbContext) : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (Guid.TryParse(Context.User?.FindFirst("barbershop_id")?.Value, out var shopId))
            await Groups.AddToGroupAsync(Context.ConnectionId, Group(shopId));
        await base.OnConnectedAsync();
    }

    public async Task<bool> JoinPublicShop(string slug)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var shopId = await dbContext.BarberShops.AsNoTracking().Where(x => x.Slug == normalizedSlug && x.IsActive).Select(x => (Guid?)x.Id).SingleOrDefaultAsync();
        if (shopId is null)
            return false;
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(shopId.Value));
        return true;
    }

    internal static string Group(Guid shopId) => $"shop:{shopId:N}";
}

public sealed class SignalRQueueNotifier(IHubContext<QueueHub> hubContext) : IQueueNotifier
{
    public Task QueueChangedAsync(Guid barberShopId, string eventName, CancellationToken cancellationToken = default) =>
        hubContext.Clients.Group(QueueHub.Group(barberShopId)).SendAsync("queueChanged", new { eventName, occurredAtUtc = DateTimeOffset.UtcNow }, cancellationToken);
}
