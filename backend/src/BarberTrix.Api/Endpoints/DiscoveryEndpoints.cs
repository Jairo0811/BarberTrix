using BarberTrix.Application.Discovery;
using BarberTrix.Api.Contracts;

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
                var maxBytes = kind.Trim().Equals("logo", StringComparison.OrdinalIgnoreCase) ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
                if (string.IsNullOrEmpty(request.Base64)) return ApiErrorResults.BadRequest(context, "MEDIA_EMPTY", "Select an image.");
                if (request.Base64.Length > 4 * ((maxBytes + 2) / 3)) return ApiErrorResults.BadRequest(context, "MEDIA_TOO_LARGE", "The image exceeds the size limit.");
                var bytes = Convert.FromBase64String(request.Base64);
                var url = await storage.SaveAsync(ShopId(context), kind, request.FileName, request.ContentType, bytes, ct);
                return Results.Ok(new ShopMediaUploadResponse(url));
            }
            catch (FormatException)
            {
                return ApiErrorResults.BadRequest(context, "MEDIA_TYPE_INVALID", "The selected image could not be read.");
            }
            catch (ArgumentException ex)
            {
                var code = ex.Message is "MEDIA_EMPTY" or "MEDIA_TOO_LARGE" or "MEDIA_TYPE_INVALID" or "MEDIA_KIND_INVALID" ? ex.Message : "MEDIA_TYPE_INVALID";
                return ApiErrorResults.BadRequest(context, code, "The image is invalid or exceeds the size limit.");
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
