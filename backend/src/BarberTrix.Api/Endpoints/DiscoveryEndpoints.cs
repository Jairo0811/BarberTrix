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

        endpoints.MapGet("/api/public/shop-media/{shopId:guid}/{kind}", async (Guid shopId, string kind, IShopMediaStorage storage, CancellationToken ct) =>
        {
            try
            {
                var media = await storage.OpenAsync(shopId, kind, ct);
                return media is null ? Results.NotFound() : Results.Stream(media.Stream, media.ContentType, enableRangeProcessing: true);
            }
            catch (ArgumentException)
            {
                return Results.NotFound();
            }
        }).WithTags("Public discovery").RequireRateLimiting("publicQueue");

        var profile = endpoints.MapGroup("/api/shop/public-profile")
            .WithTags("Marketplace profile")
            .RequireAuthorization("TenantUser")
            .RequireAuthorization(policy => policy.RequireRole("Owner"));

        profile.MapGet("/", async (HttpContext context, IPublicShopProfileService service, CancellationToken ct) =>
            Results.Ok(await service.GetAsync(ShopId(context), ct)));

        profile.MapPut("/", async (UpdatePublicShopProfileRequest request, HttpContext context, IPublicShopProfileService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.UpdateAsync(ShopId(context), request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or ArgumentOutOfRangeException)
            {
                return Results.BadRequest(new { code = "public_profile_invalid", message = ex.Message });
            }
        });

        profile.MapPost("/media/{kind}", async (string kind, UploadShopMediaRequest request, HttpContext context, IShopMediaStorage storage, CancellationToken ct) =>
        {
            try
            {
                var bytes = Convert.FromBase64String(request.Base64);
                var url = await storage.SaveAsync(ShopId(context), kind, request.FileName, request.ContentType, bytes, ct);
                return Results.Ok(new ShopMediaUploadResponse(url));
            }
            catch (FormatException)
            {
                return Results.BadRequest(new { code = "public_profile_media_invalid", message = "The selected image could not be read." });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { code = "public_profile_media_invalid", message = ex.Message });
            }
        }).RequireRateLimiting("registration");

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
