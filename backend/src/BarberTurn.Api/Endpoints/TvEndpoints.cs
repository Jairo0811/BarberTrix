using System.Security.Claims;
using BarberTurn.Api.Contracts;
using BarberTurn.Application.Tv;

namespace BarberTurn.Api.Endpoints;

public static class TvEndpoints
{
    public const string DisplayTokenHeader = "X-BarberTrix-TV-Token";

    public static IEndpointRouteBuilder MapTvEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var admin = endpoints.MapGroup("/api/tv/displays")
            .WithTags("BarberTrix TV")
            .RequireAuthorization("TenantUser")
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));

        admin.MapGet("/", async (HttpContext context, ITvDisplayService service, CancellationToken ct) =>
            await ExecuteEntitledAsync(context, () => service.ListAsync(GetShopId(context), ct)));

        admin.MapPost("/", async (CreateTvDisplayRequest request, HttpContext context, ITvDisplayService service, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateAsync(GetShopId(context), request, ct);
                return Results.Created($"/api/tv/displays/{created.Display.Id}", new { created.Display, created.Pairing });
            }
            catch (ArgumentException ex)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.TvInvalid, ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return ApiErrorResults.Forbidden(context, ApiErrorCodes.PlanFeatureUnavailable, ex.Message);
            }
        });

        admin.MapPost("/{displayId:guid}/pairing", async (Guid displayId, HttpContext context, ITvDisplayService service, CancellationToken ct) =>
        {
            try
            {
                return await service.IssuePairingCodeAsync(GetShopId(context), displayId, ct) is { } pairing
                    ? Results.Ok(pairing)
                    : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return ApiErrorResults.Forbidden(context, ApiErrorCodes.PlanFeatureUnavailable, ex.Message);
            }
        });

        admin.MapDelete("/{displayId:guid}", async (Guid displayId, HttpContext context, ITvDisplayService service, CancellationToken ct) =>
            await service.RevokeAsync(GetShopId(context), displayId, ct) ? Results.NoContent() : Results.NotFound());

        endpoints.MapPost("/api/tv/pair", async (PairTvDisplayRequest request, HttpContext context, ITvDisplayService service, CancellationToken ct) =>
        {
            var paired = await service.PairAsync(request.Code, ct);
            return paired is null
                ? Results.NotFound(ApiError.From(context, ApiErrorCodes.TvPairingInvalid, "The TV pairing code is invalid or expired."))
                : Results.Ok(paired);
        })
        .WithTags("BarberTrix TV")
        .RequireRateLimiting("tvPairing");

        endpoints.MapGet("/api/tv/session", async (HttpContext context, ITvDisplayService service, CancellationToken ct) =>
        {
            var token = ReadDisplayToken(context);
            if (token is null)
                return ApiErrorResults.Unauthorized(context, ApiErrorCodes.TvSessionInvalid, "A valid BarberTrix TV display token is required.");

            var snapshot = await service.GetSnapshotAsync(token, ct);
            return snapshot is null
                ? ApiErrorResults.Unauthorized(context, ApiErrorCodes.TvSessionInvalid, "The BarberTrix TV display session is invalid or no longer active.")
                : Results.Ok(snapshot);
        })
        .WithTags("BarberTrix TV")
        .RequireRateLimiting("publicQueue");

        return endpoints;
    }

    public static string? ReadDisplayToken(HttpContext context)
    {
        var value = context.Request.Headers[DisplayTokenHeader].ToString().Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static Guid GetShopId(HttpContext context) =>
        Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var id)
            ? id
            : throw new InvalidOperationException("Invalid barbershop context.");

    private static async Task<IResult> ExecuteEntitledAsync<T>(HttpContext context, Func<Task<T>> operation)
    {
        try { return Results.Ok(await operation()); }
        catch (InvalidOperationException ex) { return ApiErrorResults.Forbidden(context, ApiErrorCodes.PlanFeatureUnavailable, ex.Message); }
    }
}
