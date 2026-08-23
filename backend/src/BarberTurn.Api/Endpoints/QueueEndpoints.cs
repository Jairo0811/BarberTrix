using BarberTurn.Application.Queue;

namespace BarberTurn.Api.Endpoints;

public static class QueueEndpoints
{
    public static IEndpointRouteBuilder MapQueueEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/queue")
            .WithTags("Queue")
            .RequireAuthorization();

        group.MapGet("/barbers", async (HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
        {
            var barberShopId = GetBarberShopId(context);
            return Results.Ok(await queueService.GetBarbersAsync(barberShopId, cancellationToken));
        });

        group.MapPost("/barbers", async (CreateBarberRequest request, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await queueService.CreateBarberAsync(GetBarberShopId(context), request, cancellationToken);
                return Results.Created($"/api/queue/barbers/{response.Id}", response);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));

        group.MapPatch("/barbers/{barberId:guid}/status", async (Guid barberId, ChangeBarberStatusRequest request, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
        {
            var response = await queueService.ChangeBarberStatusAsync(GetBarberShopId(context), barberId, request, cancellationToken);
            return response is null ? Results.NotFound() : Results.Ok(response);
        });

        group.MapGet("/services", async (HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
        {
            var barberShopId = GetBarberShopId(context);
            return Results.Ok(await queueService.GetServicesAsync(barberShopId, cancellationToken));
        });

        group.MapPost("/services", async (CreateServiceRequest request, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await queueService.CreateServiceAsync(GetBarberShopId(context), request, cancellationToken);
                return Results.Created($"/api/queue/services/{response.Id}", response);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));

        group.MapGet("/turns", async (HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
            Results.Ok(await queueService.GetQueueAsync(GetBarberShopId(context), cancellationToken)));

        group.MapPost("/turns", async (CreateTurnRequest request, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await queueService.CreateTurnAsync(GetBarberShopId(context), request, cancellationToken);
                return Results.Created($"/api/queue/turns/{response.Id}", response);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        group.MapPost("/turns/{turnId:guid}/call/{barberId:guid}", async (Guid turnId, Guid barberId, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
            await ExecuteTransitionAsync(() => queueService.CallTurnAsync(GetBarberShopId(context), turnId, barberId, cancellationToken)));

        group.MapPost("/turns/{turnId:guid}/start", async (Guid turnId, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
            await ExecuteTransitionAsync(() => queueService.StartTurnAsync(GetBarberShopId(context), turnId, cancellationToken)));

        group.MapPost("/turns/{turnId:guid}/complete", async (Guid turnId, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
            await ExecuteTransitionAsync(() => queueService.CompleteTurnAsync(GetBarberShopId(context), turnId, cancellationToken)));

        group.MapPost("/turns/{turnId:guid}/cancel", async (Guid turnId, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
            await ExecuteTransitionAsync(() => queueService.CancelTurnAsync(GetBarberShopId(context), turnId, cancellationToken)));

        group.MapPost("/turns/{turnId:guid}/no-show", async (Guid turnId, HttpContext context, IQueueService queueService, CancellationToken cancellationToken) =>
            await ExecuteTransitionAsync(() => queueService.MarkNoShowAsync(GetBarberShopId(context), turnId, cancellationToken)));

        return endpoints;
    }

    private static Guid GetBarberShopId(HttpContext context)
    {
        var value = context.User.FindFirst("barbershop_id")?.Value;
        return Guid.TryParse(value, out var barberShopId)
            ? barberShopId
            : throw new InvalidOperationException("The authenticated user does not have a valid barbershop context.");
    }

    private static async Task<IResult> ExecuteTransitionAsync(Func<Task<TurnResponse?>> transition)
    {
        try
        {
            var response = await transition();
            return response is null ? Results.NotFound() : Results.Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { message = ex.Message });
        }
    }
}
