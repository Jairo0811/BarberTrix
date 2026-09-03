using System.Security.Claims;
using BarberTrix.Api.Contracts;
using BarberTrix.Application.Common;
using BarberTrix.Application.TurnRequests;

namespace BarberTrix.Api.Endpoints;

public static class TurnRequestEndpoints
{
    public static IEndpointRouteBuilder MapTurnRequestEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/shops/{slug}/turn-requests")
            .WithTags("Public turn requests")
            .RequireRateLimiting("publicQueue");

        publicGroup.MapPost("/", async (
            string slug,
            CreateTurnRequestRequest request,
            HttpContext context,
            ITurnRequestService service,
            IPlanLimitService limits,
            IShopLookupService shops,
            CancellationToken ct) =>
        {
            try
            {
                var shopId = await shops.GetActiveShopIdBySlugAsync(slug, ct);
                if (shopId is null) return Results.NotFound();
                await limits.EnsureCanUseAsync(shopId.Value, PlanFeature.Appointments, ct);
                var response = await service.CreatePublicAsync(slug, request, ct);
                return Results.Created($"/api/public/shops/{slug}/turn-requests/{response.Request.Id}", response);
            }
            catch (BusinessRuleException ex)
            {
                return ApiErrorResults.Conflict(context, ex.Code, ex.Message);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("feature", StringComparison.OrdinalIgnoreCase) || ex.Message.Contains("plan", StringComparison.OrdinalIgnoreCase))
            {
                return ApiErrorResults.Forbidden(context, ApiErrorCodes.PlanFeatureUnavailable, ex.Message);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.TurnRequestInvalid, ex.Message);
            }
        });

        publicGroup.MapGet("/{requestId:guid}", async (string slug, Guid requestId, string token, ITurnRequestService service, CancellationToken ct) =>
            await service.GetPublicAsync(slug, requestId, token, ct) is { } response ? Results.Ok(response) : Results.NotFound());

        publicGroup.MapDelete("/{requestId:guid}", async (string slug, Guid requestId, string token, HttpContext context, ITurnRequestService service, CancellationToken ct) =>
        {
            try { return await service.CancelPublicAsync(slug, requestId, token, ct) ? Results.NoContent() : Results.NotFound(); }
            catch (InvalidOperationException ex) { return ApiErrorResults.Conflict(context, ApiErrorCodes.TurnRequestConflict, ex.Message); }
        });

        publicGroup.MapPost("/{requestId:guid}/accept-counter", async (string slug, Guid requestId, string token, HttpContext context, ITurnRequestService service, CancellationToken ct) =>
            await ExecutePublicTransitionAsync(context, () => service.AcceptCounterPublicAsync(slug, requestId, token, ct)));

        var group = endpoints.MapGroup("/api/turn-requests")
            .WithTags("Turn requests")
            .RequireAuthorization("TenantUser");

        group.MapGet("/", async (HttpContext context, ITurnRequestService service, CancellationToken ct) =>
        {
            Guid? barberId = null;
            if (context.User.IsInRole("Barber"))
            {
                if (!Guid.TryParse(context.User.FindFirstValue("barber_id"), out var ownBarberId))
                    return Results.Ok(Array.Empty<TurnRequestResponse>());
                barberId = ownBarberId;
            }
            return Results.Ok(await service.GetForStaffAsync(GetShopId(context), barberId, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        group.MapPost("/{requestId:guid}/accept", async (Guid requestId, HttpContext context, ITurnRequestService service, CancellationToken ct) =>
        {
            if (!await CanOperateAsync(context, requestId, service, ct)) return Results.Forbid();
            return await ExecuteStaffTransitionAsync(context, () => service.AcceptAsync(GetShopId(context), requestId, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        group.MapPost("/{requestId:guid}/reject", async (Guid requestId, HttpContext context, ITurnRequestService service, CancellationToken ct) =>
        {
            if (!await CanOperateAsync(context, requestId, service, ct)) return Results.Forbid();
            return await ExecuteStaffTransitionAsync(context, () => service.RejectAsync(GetShopId(context), requestId, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        group.MapPost("/{requestId:guid}/counter", async (Guid requestId, CounterProposeTurnRequestRequest request, HttpContext context, ITurnRequestService service, CancellationToken ct) =>
        {
            if (!await CanOperateAsync(context, requestId, service, ct)) return Results.Forbid();
            return await ExecuteStaffTransitionAsync(context, () => service.CounterProposeAsync(GetShopId(context), requestId, request, ct));
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        return endpoints;
    }

    private static async Task<bool> CanOperateAsync(HttpContext context, Guid requestId, ITurnRequestService service, CancellationToken ct)
    {
        if (!context.User.IsInRole("Barber")) return true;
        if (!Guid.TryParse(context.User.FindFirstValue("barber_id"), out var ownBarberId)) return false;
        var request = await service.GetAsync(GetShopId(context), requestId, ct);
        return request?.BarberId == ownBarberId;
    }

    private static async Task<IResult> ExecuteStaffTransitionAsync(HttpContext context, Func<Task<TurnRequestResponse?>> operation)
    {
        try { return await operation() is { } response ? Results.Ok(response) : Results.NotFound(); }
        catch (BusinessRuleException ex) { return ApiErrorResults.Conflict(context, ex.Code, ex.Message); }
        catch (InvalidOperationException ex) { return ApiErrorResults.Conflict(context, ApiErrorCodes.TurnRequestConflict, ex.Message); }
        catch (ArgumentException ex) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.TurnRequestInvalid, ex.Message); }
    }

    private static async Task<IResult> ExecutePublicTransitionAsync(HttpContext context, Func<Task<TurnRequestResponse?>> operation)
    {
        try { return await operation() is { } response ? Results.Ok(response) : Results.NotFound(); }
        catch (BusinessRuleException ex) { return ApiErrorResults.Conflict(context, ex.Code, ex.Message); }
        catch (InvalidOperationException ex) { return ApiErrorResults.Conflict(context, ApiErrorCodes.TurnRequestConflict, ex.Message); }
        catch (ArgumentException ex) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.TurnRequestInvalid, ex.Message); }
    }

    private static Guid GetShopId(HttpContext context) =>
        Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var id)
            ? id
            : throw new InvalidOperationException("Invalid barbershop context.");
}
