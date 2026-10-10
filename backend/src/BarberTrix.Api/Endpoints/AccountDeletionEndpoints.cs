using System.Security.Claims;
using BarberTrix.Api.Contracts;
using BarberTrix.Application.Auth;

namespace BarberTrix.Api.Endpoints;

public static class AccountDeletionEndpoints
{
    private const string RefreshCookieName = "barbertrix.refresh";

    public static IEndpointRouteBuilder MapAccountDeletionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapDelete("/api/account", async (
            DeleteAccountRequest request,
            HttpContext context,
            IAccountDeletionService service,
            CancellationToken cancellationToken) =>
        {
            context.Response.Headers.CacheControl = "no-store";

            if (!TryGetUserId(context, out var userId))
                return ApiErrorResults.Unauthorized(context, "ACCOUNT_DELETION_UNAUTHORIZED", "A valid authenticated account is required.");

            try
            {
                var response = await service.DeleteAsync(userId, request.Confirmation, cancellationToken);
                DeleteRefreshCookie(context);
                return Results.Ok(response);
            }
            catch (ArgumentException ex)
            {
                return ApiErrorResults.BadRequest(context, "ACCOUNT_DELETION_CONFIRMATION_REQUIRED", ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return ApiErrorResults.Conflict(context, "ACCOUNT_DELETION_FAILED", ex.Message);
            }
        })
        .WithTags("Account")
        .RequireAuthorization()
        .RequireRateLimiting("auth");

        return endpoints;
    }

    private static bool TryGetUserId(HttpContext context, out Guid userId)
    {
        var value = context.User.FindFirst(JwtSubjectClaim)?.Value
            ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out userId);
    }

    private const string JwtSubjectClaim = "sub";

    private static void DeleteRefreshCookie(HttpContext context) =>
        context.Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth"
        });
}
