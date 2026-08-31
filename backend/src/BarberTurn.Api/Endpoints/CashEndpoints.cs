using BarberTurn.Api.Filters;
using BarberTurn.Application.Cash;
using BarberTurn.Application.Common;

namespace BarberTurn.Api.Endpoints;

public static class CashEndpoints
{
    public static IEndpointRouteBuilder MapCashEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var cash = endpoints.MapGroup("/api/cash")
            .WithTags("Cash")
            .RequireAuthorization("VerifiedUser")
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"))
            .AddEndpointFilter<NonDemoTenantFilter>();

        cash.MapGet("/current", async (HttpContext context, ICashManagementService service, CancellationToken ct) =>
        {
            var session = await service.GetCurrentAsync(ShopId(context), ct);
            return session is null ? Results.NoContent() : Results.Ok(session);
        });

        cash.MapGet("/sessions", async (int? take, HttpContext context, ICashManagementService service, CancellationToken ct) =>
            Results.Ok(await service.GetRecentAsync(ShopId(context), take ?? 10, ct)));

        cash.MapPost("/open", async (OpenCashSessionRequest request, HttpContext context, ICashManagementService service, CancellationToken ct) =>
        {
            try { return Results.Created("/api/cash/current", await service.OpenAsync(ShopId(context), UserId(context), request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.PaymentInvalid, ex.Message);
            }
        });

        cash.MapPost("/movements", async (AddCashMovementRequest request, HttpContext context, ICashManagementService service, CancellationToken ct) =>
        {
            try { return Results.Created("/api/cash/current", await service.AddMovementAsync(ShopId(context), UserId(context), request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.PaymentInvalid, ex.Message);
            }
        });

        cash.MapPost("/close", async (CloseCashSessionRequest request, HttpContext context, ICashManagementService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CloseAsync(ShopId(context), UserId(context), request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.PaymentInvalid, ex.Message);
            }
        });

        endpoints.MapPost("/api/payments/{id:guid}/refund", async (Guid id, RefundPaymentRequest request, HttpContext context, ICashManagementService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.RefundPaymentAsync(ShopId(context), UserId(context), id, request.Reason, ct)); }
            catch (KeyNotFoundException) { return Results.NotFound(); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.PaymentInvalid, ex.Message);
            }
        })
        .WithTags("Cash")
        .RequireAuthorization("VerifiedUser")
        .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist"))
        .AddEndpointFilter<NonDemoTenantFilter>();

        return endpoints;
    }

    private static Guid ShopId(HttpContext context) =>
        Guid.TryParse(context.User.FindFirst("barbershop_id")?.Value, out var id)
            ? id
            : throw new InvalidOperationException("Invalid barbershop context.");

    private static Guid? UserId(HttpContext context)
    {
        var value = context.User.FindFirst("sub")?.Value
            ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
