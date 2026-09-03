using BarberTrix.Application.Discovery;

namespace BarberTrix.Api.Endpoints;

public static class DiscoveryEndpoints
{
    public static IEndpointRouteBuilder MapDiscoveryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/public/discovery/shops", async (string? q, int? limit, IDiscoveryService discovery, CancellationToken ct) =>
            Results.Ok(await discovery.SearchAsync(q, limit ?? 20, ct)))
            .WithTags("Public discovery")
            .RequireRateLimiting("publicQueue");

        var profile = endpoints.MapGroup("/api/shop/public-profile")
            .WithTags("Marketplace profile")
            .RequireAuthorization("TenantUser")
            .RequireAuthorization(policy => policy.RequireRole("Owner"));

        profile.MapGet("/", async (HttpContext context, IPublicShopProfileService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(ShopId(context), ct)));

        profile.MapPut("/", async (UpdatePublicShopProfileRequest request, HttpContext context, IPublicShopProfileService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.UpdateAsync(ShopId(context), request, ct)); }
            catch (ArgumentException ex) { return Results.BadRequest(new { code = "public_profile_invalid", message = ex.Message }); }
        });

        profile.MapPut("/publication", async (SetPublicationRequest request, HttpContext context, IPublicShopProfileService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.SetPublishedAsync(ShopId(context), request.Published, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { code = "public_profile_incomplete", message = ex.Message }); }
        });

        return endpoints;
    }

    private static Guid ShopId(HttpContext context) => Guid.Parse(context.User.FindFirst("barbershop_id")!.Value);
    public sealed record SetPublicationRequest(bool Published);
}
