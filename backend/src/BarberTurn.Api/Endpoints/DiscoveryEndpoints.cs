using BarberTurn.Application.Discovery;

namespace BarberTurn.Api.Endpoints;

public static class DiscoveryEndpoints
{
    public static IEndpointRouteBuilder MapDiscoveryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/public/discovery/shops", async (
            string? q,
            int? limit,
            IDiscoveryService discovery,
            CancellationToken ct) =>
        {
            var result = await discovery.SearchAsync(q, limit ?? 20, ct);
            return Results.Ok(result);
        })
        .WithTags("Public discovery")
        .RequireRateLimiting("publicQueue");

        return endpoints;
    }
}
