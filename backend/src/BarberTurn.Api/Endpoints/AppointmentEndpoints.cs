using BarberTurn.Application.Appointments;

namespace BarberTurn.Api.Endpoints;

public static class AppointmentEndpoints
{
    public static IEndpointRouteBuilder MapAppointmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var publicGroup = endpoints.MapGroup("/api/public/shops/{slug}/appointments").WithTags("Public appointments").RequireRateLimiting("publicQueue");
        publicGroup.MapGet("/availability", async (string slug, Guid serviceId, DateOnly date, Guid? barberId, IAppointmentService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.GetAvailabilityAsync(slug, serviceId, date, barberId, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
        });
        publicGroup.MapPost("/", async (string slug, CreateAppointmentRequest request, IAppointmentService service, CancellationToken ct) =>
        {
            try { return Results.Created($"/api/public/shops/{slug}/appointments", await service.CreatePublicAsync(slug, request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
        });
        publicGroup.MapGet("/{appointmentId:guid}", async (string slug, Guid appointmentId, string token, IAppointmentService service, CancellationToken ct) =>
            await service.GetPublicAsync(slug, appointmentId, token, ct) is { } response ? Results.Ok(response) : Results.NotFound());
        publicGroup.MapDelete("/{appointmentId:guid}", async (string slug, Guid appointmentId, string token, IAppointmentService service, CancellationToken ct) =>
        {
            try { return await service.CancelPublicAsync(slug, appointmentId, token, ct) ? Results.NoContent() : Results.NotFound(); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { message = ex.Message }); }
        });

        var group = endpoints.MapGroup("/api/appointments").WithTags("Appointments").RequireAuthorization("VerifiedUser");
        group.MapGet("/", async (DateTimeOffset? from, DateTimeOffset? to, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(ShopId(context), from ?? DateTimeOffset.UtcNow.Date, to ?? DateTimeOffset.UtcNow.AddDays(30), ct)));
        group.MapPut("/{id:guid}", async (Guid id, RescheduleAppointmentRequest request, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(() => service.RescheduleAsync(ShopId(context), id, request, ct)));
        group.MapPost("/{id:guid}/check-in", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await service.CheckInAsync(ShopId(context), id, ct) is Guid turnId ? Results.Ok(new { turnId }) : Results.NotFound());
        group.MapPost("/{id:guid}/complete", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(() => service.CompleteAsync(ShopId(context), id, ct)));
        group.MapPost("/{id:guid}/no-show", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(() => service.MarkNoShowAsync(ShopId(context), id, ct)));
        group.MapDelete("/{id:guid}", async (Guid id, HttpContext context, IAppointmentService service, CancellationToken ct) =>
            await ExecuteAsync(() => service.CancelAsync(ShopId(context), id, ct)));
        group.MapPost("/blocks", async (CreateBlockedTimeRequest request, HttpContext context, IAppointmentService service, CancellationToken ct) =>
        {
            try { await service.CreateBlockAsync(ShopId(context), request, ct); return Results.NoContent(); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        return endpoints;
    }

    private static Guid ShopId(HttpContext context) => Guid.TryParse(context.User.FindFirst("barbershop_id")?.Value, out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");
    private static async Task<IResult> ExecuteAsync(Func<Task<AppointmentResponse?>> operation)
    {
        try { return await operation() is { } response ? Results.Ok(response) : Results.NotFound(); }
        catch (InvalidOperationException ex) { return Results.Conflict(new { message = ex.Message }); }
    }
}
