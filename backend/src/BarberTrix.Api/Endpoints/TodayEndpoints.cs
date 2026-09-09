using System.Security.Claims;
using BarberTrix.Application.Appointments;
using BarberTrix.Application.Commercial;
using BarberTrix.Application.Queue;
using BarberTrix.Application.TurnRequests;

namespace BarberTrix.Api.Endpoints;

public static class TodayEndpoints
{
    public static IEndpointRouteBuilder MapTodayEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/operations/today", async (HttpContext context, ICommercialService commercial, IQueueService queue, IAppointmentService appointments, ITurnRequestService requests, CancellationToken ct) =>
        {
            var shopId = Guid.Parse(context.User.FindFirstValue("barbershop_id")!);
            Guid? ownBarber = null;
            if (context.User.IsInRole("Barber"))
            {
                if (!Guid.TryParse(context.User.FindFirstValue("barber_id"), out var id)) return Results.Forbid();
                ownBarber = id;
            }
            var shop = await commercial.GetShopSettingsAsync(shopId, ct);
            var zone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId);
            var localDay = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).Date;
            var from = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localDay, zone));
            var to = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localDay.AddDays(1), zone));
            // Services share a scoped DbContext. Keep these reads sequential.
            var turns = await queue.GetQueueAsync(shopId, ct);
            var staff = await queue.GetBarbersAsync(shopId, ct);
            var agenda = await appointments.GetAsync(shopId, from, to, ct);
            var pendingRequests = await requests.CountPendingForStaffAsync(shopId, ownBarber, ct);
            var metrics = await queue.GetMetricsAsync(shopId, ct);
            return Results.Ok(new {
                shopName = shop.Name, shopSlug = shop.Slug, timeZoneId = shop.TimeZoneId,
                updatedAtUtc = DateTimeOffset.UtcNow,
                turns = turns.Where(x => ownBarber == null || x.BarberId == ownBarber),
                barbers = staff.Where(x => x.IsActive && (ownBarber == null || x.Id == ownBarber)),
                appointments = agenda.Where(x => ownBarber == null || x.BarberId == ownBarber),
                pendingRequests,
                estimatedWaitMinutes = metrics.EstimatedWaitMinutes
            });
        }).RequireAuthorization("TenantUser")
          .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"))
          .WithTags("Operations");
        return endpoints;
    }
}
