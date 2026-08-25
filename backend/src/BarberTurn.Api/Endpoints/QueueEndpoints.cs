using System.Security.Claims;
using BarberTurn.Application.Queue;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Api.Endpoints;

public static class QueueEndpoints
{
    public static IEndpointRouteBuilder MapQueueEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/shops/{slug}").WithTags("Public queue").RequireRateLimiting("publicQueue");
        publicGroup.MapGet("/", async (string slug, IQueueService service, CancellationToken ct) =>
            await service.GetPublicShopAsync(slug, ct) is { } shop ? Results.Ok(shop) : Results.NotFound());
        publicGroup.MapGet("/queue", async (string slug, IQueueService service, CancellationToken ct) =>
            await service.GetPublicQueueAsync(slug, ct) is { } queue ? Results.Ok(queue) : Results.NotFound());
        publicGroup.MapPost("/turns", async (string slug, PublicCreateTurnRequest request, IQueueService service, CancellationToken ct) =>
        {
            try { return Results.Created($"/api/public/shops/{slug}/turns", await service.CreatePublicTurnAsync(slug, request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or DbUpdateException) { return Results.BadRequest(new { message = ex.Message }); }
        });
        publicGroup.MapGet("/turns/{turnId:guid}", async (string slug, Guid turnId, string token, IQueueService service, CancellationToken ct) =>
            await service.GetPublicTurnAsync(slug, turnId, token, ct) is { } turn ? Results.Ok(turn) : Results.NotFound());
        publicGroup.MapDelete("/turns/{turnId:guid}", async (string slug, Guid turnId, string token, IQueueService service, CancellationToken ct) =>
        {
            try { return await service.CancelPublicTurnAsync(slug, turnId, token, ct) ? Results.NoContent() : Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { message = ex.Message }); }
        });

        var group = endpoints.MapGroup("/api/queue").WithTags("Queue").RequireAuthorization("VerifiedUser");
        group.MapGet("/barbers", async (HttpContext context, IQueueService service, CancellationToken ct) => Results.Ok(await service.GetBarbersAsync(GetShopId(context), ct)));
        group.MapPost("/barbers", async (CreateBarberRequest request, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteCreateAsync(() => service.CreateBarberAsync(GetShopId(context), request, ct), "/api/queue/barbers"))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        group.MapPut("/barbers/{barberId:guid}", async (Guid barberId, UpdateBarberRequest request, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteTransitionAsync(() => service.UpdateBarberAsync(GetShopId(context), barberId, request, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        group.MapPatch("/barbers/{barberId:guid}/status", async (Guid barberId, ChangeBarberStatusRequest request, HttpContext context, IQueueService service, CancellationToken ct) =>
        {
            if (!CanOperateBarber(context.User, barberId)) return Results.Forbid();
            return await ExecuteTransitionAsync(() => service.ChangeBarberStatusAsync(GetShopId(context), barberId, request, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        group.MapGet("/services", async (HttpContext context, IQueueService service, CancellationToken ct) => Results.Ok(await service.GetServicesAsync(GetShopId(context), ct)));
        group.MapPost("/services", async (CreateServiceRequest request, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteCreateAsync(() => service.CreateServiceAsync(GetShopId(context), request, ct), "/api/queue/services"))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        group.MapPut("/services/{serviceId:guid}", async (Guid serviceId, UpdateServiceRequest request, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteTransitionAsync(() => service.UpdateServiceAsync(GetShopId(context), serviceId, request, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));

        group.MapGet("/turns", async (HttpContext context, IQueueService service, CancellationToken ct) => Results.Ok(await service.GetQueueAsync(GetShopId(context), ct)));
        group.MapGet("/metrics", async (HttpContext context, IQueueService service, CancellationToken ct) => Results.Ok(await service.GetMetricsAsync(GetShopId(context), ct)));
        group.MapGet("/history", async (DateOnly? from, DateOnly? to, int? take, HttpContext context, IQueueService service, CancellationToken ct) =>
        {
            var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
            return Results.Ok(await service.GetHistoryAsync(GetShopId(context), from ?? end.AddDays(-30), end, take ?? 100, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        group.MapPost("/turns", async (CreateTurnRequest request, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteCreateAsync(() => service.CreateTurnAsync(GetShopId(context), request, ct), "/api/queue/turns"))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));

        group.MapPost("/turns/{turnId:guid}/call/{barberId:guid}", async (Guid turnId, Guid barberId, HttpContext context, IQueueService service, CancellationToken ct) =>
        {
            if (!CanOperateBarber(context.User, barberId)) return Results.Forbid();
            return await ExecuteTransitionAsync(() => service.CallTurnAsync(GetShopId(context), turnId, barberId, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));
        group.MapPost("/turns/{turnId:guid}/start", async (Guid turnId, HttpContext context, IQueueService service, CancellationToken ct) =>
        {
            if (!await CanOperateTurnAsync(context, turnId, service, ct)) return Results.Forbid();
            return await ExecuteTransitionAsync(() => service.StartTurnAsync(GetShopId(context), turnId, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));
        group.MapPost("/turns/{turnId:guid}/complete", async (Guid turnId, HttpContext context, IQueueService service, CancellationToken ct) =>
        {
            if (!await CanOperateTurnAsync(context, turnId, service, ct)) return Results.Forbid();
            return await ExecuteTransitionAsync(() => service.CompleteTurnAsync(GetShopId(context), turnId, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));
        group.MapPost("/turns/{turnId:guid}/cancel", async (Guid turnId, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteTransitionAsync(() => service.CancelTurnAsync(GetShopId(context), turnId, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));
        group.MapPost("/turns/{turnId:guid}/no-show", async (Guid turnId, HttpContext context, IQueueService service, CancellationToken ct) =>
            await ExecuteTransitionAsync(() => service.MarkNoShowAsync(GetShopId(context), turnId, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        return endpoints;
    }

    private static Guid GetShopId(HttpContext context) => Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");
    private static bool CanOperateBarber(ClaimsPrincipal user, Guid barberId) => !user.IsInRole("Barber") || Guid.TryParse(user.FindFirstValue("barber_id"), out var ownId) && ownId == barberId;
    private static async Task<bool> CanOperateTurnAsync(HttpContext context, Guid turnId, IQueueService service, CancellationToken ct)
    {
        if (!context.User.IsInRole("Barber")) return true;
        if (!Guid.TryParse(context.User.FindFirstValue("barber_id"), out var ownBarberId)) return false;
        return (await service.GetQueueAsync(GetShopId(context), ct)).Any(x => x.Id == turnId && x.BarberId == ownBarberId);
    }

    private static async Task<IResult> ExecuteCreateAsync<T>(Func<Task<T>> operation, string location)
    {
        try { return Results.Created(location, await operation()); }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or DbUpdateException) { return Results.BadRequest(new { message = ex.Message }); }
    }

    private static async Task<IResult> ExecuteTransitionAsync<T>(Func<Task<T?>> operation) where T : class
    {
        try { return await operation() is { } response ? Results.Ok(response) : Results.NotFound(); }
        catch (InvalidOperationException ex) { return Results.Conflict(new { message = ex.Message }); }
        catch (DbUpdateException ex) { return Results.BadRequest(new { message = ex.InnerException?.Message ?? ex.Message }); }
    }
}
