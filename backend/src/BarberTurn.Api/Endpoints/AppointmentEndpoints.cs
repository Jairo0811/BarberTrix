using System.Security.Claims;
using BarberTurn.Api.Contracts;
using BarberTurn.Application.Appointments;
using BarberTurn.Application.Common;

namespace BarberTurn.Api.Endpoints;

public static class AppointmentEndpoints
{
    public static IEndpointRouteBuilder MapAppointmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/shops/{slug}/appointments").WithTags("Public appointments").RequireRateLimiting("publicQueue");
        publicGroup.MapGet("/availability", async (string slug, Guid serviceId, DateOnly date, Guid? barberId, HttpContext context, IAppointmentService service, IPlanLimitService limits, IShopLookupService shops, CancellationToken ct) =>
        {
            try
            {
                var shopId = await shops.GetActiveShopIdBySlugAsync(slug, ct);
                if (shopId is null) return Results.NotFound();
                await limits.EnsureCanUseAsync(shopId.Value, PlanFeature.Appointments, ct);
                return Results.Ok(await service.GetAvailabilityAsync(slug, serviceId, date, barberId, ct));
            }
            catch (InvalidOperationException ex)
            {
                return ApiErrorResults.Forbidden(context, ApiErrorCodes.PlanFeatureUnavailable, ex.Message);
            }
        });
        publicGroup.MapPost("/", async (string slug, CreateAppointmentRequest request, HttpContext context, IAppointmentService service, IPlanLimitService limits, IShopLookupService shops, CancellationToken ct) =>
        {
            try
            {
                var shopId = await shops.GetActiveShopIdBySlugAsync(slug, ct);
                if (shopId is null) return Results.NotFound();
                await limits.EnsureCanUseAsync(shopId.Value, PlanFeature.Appointments, ct);
                return Results.Created($"/api/public/shops/{slug}/appointments", await service.CreatePublicAsync(slug, request, ct));
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.AppointmentInvalid, ex.Message);
            }
        });
        publicGroup.MapGet("/{appointmentId:guid}", async (string slug, Guid appointmentId, string token, IAppointmentService service, CancellationToken ct) =>
            await service.GetPublicAsync(slug, appointmentId, token, ct) is { } response ? Results.Ok(response) : Results.NotFound());
        publicGroup.MapDelete("/{appointmentId:guid}", async (string slug, Guid appointmentId, string token, HttpContext context, IAppointmentService service, CancellationToken ct) =>
        {
            try { return await service.CancelPublicAsync(slug, appointmentId, token, ct) ? Results.NoContent() : Results.NotFound(); }
            catch (InvalidOperationException ex) { return ApiErrorResults.Conflict(context, ApiErrorCodes.AppointmentConflict, ex.Message); }
        });

        var group = endpoints.MapGroup("/api/appointments").WithTags("Appointments").RequireAuthorization("VerifiedUser");
        group.MapGet("/", async (DateTimeOffset? from, DateTimeOffset? to, HttpContext context, IAppointmentService service, CancellationToken ct) =>
        {
            var items = await service.GetAsync(ShopId(context), from ?? DateTimeOffset.UtcNow.Date, to ?? DateTimeOffset.UtcNow.AddDays(30), ct);
            if (!context.User.IsInRole("Barber")) return Results.Ok(items);
            return Guid.TryParse(context.User.FindFirstValue("barber_id"), out var barberId)
                ? Results.Ok(items.Where(x => x.BarberId == barberId))
                : Results.Ok(Array.Empty<AppointmentResponse>());
        });
        group.MapPut("/{id:guid}", async (Guid id, RescheduleAppointmentRequest request, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(context, () => service.RescheduleAsync(ShopId(context), id, request, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));
        group.MapPost("/{id:guid}/check-in", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await service.CheckInAsync(ShopId(context), id, ct) is Guid turnId ? Results.Ok(new { turnId }) : Results.NotFound())
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));
        group.MapPost("/{id:guid}/complete", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(context, () => service.CompleteAsync(ShopId(context), id, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));
        group.MapPost("/{id:guid}/no-show", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(context, () => service.MarkNoShowAsync(ShopId(context), id, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));
        group.MapDelete("/{id:guid}", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(context, () => service.CancelAsync(ShopId(context), id, ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"));
        group.MapPost("/blocks", async (CreateBlockedTimeRequest request, HttpContext context, IAppointmentService service, CancellationToken ct) =>
        {
            try { await service.CreateBlockAsync(ShopId(context), request, ct); return Results.NoContent(); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.AppointmentInvalid, ex.Message);
            }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        return endpoints;
    }

    private static Guid ShopId(HttpContext context) => Guid.TryParse(context.User.FindFirst("barbershop_id")?.Value, out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");

    private static async Task<IResult> ExecuteAsync(HttpContext context, Func<Task<AppointmentResponse?>> operation)
    {
        try { return await operation() is { } response ? Results.Ok(response) : Results.NotFound(); }
        catch (InvalidOperationException ex) { return ApiErrorResults.Conflict(context, ApiErrorCodes.AppointmentConflict, ex.Message); }
    }
}
