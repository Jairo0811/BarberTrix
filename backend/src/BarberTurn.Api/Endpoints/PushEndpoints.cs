using System.Security.Claims;
using BarberTurn.Api.Contracts;
using BarberTurn.Application.Push;

namespace BarberTurn.Api.Endpoints;

public static class PushEndpoints
{
    public static IEndpointRouteBuilder MapPushEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var staff = endpoints.MapGroup("/api/push/subscriptions")
            .WithTags("Push notifications")
            .RequireAuthorization("VerifiedUser");

        staff.MapPut("/", async (
            RegisterPushSubscriptionRequest request,
            HttpContext context,
            IPushSubscriptionService service,
            CancellationToken cancellationToken) =>
        {
            try
            {
                await service.RegisterStaffAsync(
                    GetRequiredClaim(context, "barbershop_id"),
                    GetRequiredUserId(context),
                    request,
                    cancellationToken);
                return Results.NoContent();
            }
            catch (ArgumentException exception)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.PushSubscriptionInvalid, exception.Message);
            }
            catch (InvalidOperationException exception)
            {
                return ApiErrorResults.Forbidden(context, ApiErrorCodes.PushSubscriptionInvalid, exception.Message);
            }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        staff.MapDelete("/{installationId:guid}", async (
            Guid installationId,
            HttpContext context,
            IPushSubscriptionService service,
            CancellationToken cancellationToken) =>
            await service.UnregisterStaffAsync(
                GetRequiredClaim(context, "barbershop_id"),
                GetRequiredUserId(context),
                installationId,
                cancellationToken)
                ? Results.NoContent()
                : Results.NotFound())
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist", "Barber"));

        var customer = endpoints.MapGroup("/api/public/shops/{slug}/turn-requests/{requestId:guid}/push-subscription")
            .WithTags("Public push notifications")
            .RequireRateLimiting("publicQueue");

        customer.MapPut("/", async (
            string slug,
            Guid requestId,
            string token,
            RegisterPushSubscriptionRequest request,
            HttpContext context,
            IPushSubscriptionService service,
            CancellationToken cancellationToken) =>
        {
            try
            {
                return await service.RegisterPublicAsync(slug, requestId, token, request, cancellationToken)
                    ? Results.NoContent()
                    : Results.NotFound();
            }
            catch (ArgumentException exception)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.PushSubscriptionInvalid, exception.Message);
            }
        });

        customer.MapDelete("/{installationId:guid}", async (
            string slug,
            Guid requestId,
            string token,
            Guid installationId,
            IPushSubscriptionService service,
            CancellationToken cancellationToken) =>
            await service.UnregisterPublicAsync(slug, requestId, token, installationId, cancellationToken)
                ? Results.NoContent()
                : Results.NotFound());

        return endpoints;
    }

    private static Guid GetRequiredUserId(HttpContext context)
    {
        var value = context.User.FindFirstValue("sub")
            ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("Invalid user context.");
    }

    private static Guid GetRequiredClaim(HttpContext context, string claimName) =>
        Guid.TryParse(context.User.FindFirstValue(claimName), out var id)
            ? id
            : throw new InvalidOperationException("Invalid barbershop context.");
}
