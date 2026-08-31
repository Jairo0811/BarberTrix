using BarberTurn.Api.Contracts;
using BarberTurn.Api.Filters;
using BarberTurn.Application.Cash;
using BarberTurn.Application.Commercial;
using BarberTurn.Application.Common;
using BarberTurn.Domain.Entities;

namespace BarberTurn.Api.Endpoints;

public static class CommercialEndpoints
{
    public static IEndpointRouteBuilder MapCommercialEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/shop/settings", async (HttpContext context, ICommercialService service, CancellationToken ct) =>
            Results.Ok(await service.GetShopSettingsAsync(ShopId(context), ct)))
            .WithTags("Settings")
            .RequireAuthorization("VerifiedUser");

        endpoints.MapPut("/api/shop/settings", async (UpdateShopSettingsRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try
            {
                await service.UpdateShopSettingsAsync(ShopId(context), request, ct);
                return Results.NoContent();
            }
            catch (Exception ex) when (ex is ArgumentException or TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.ShopSettingsInvalid, ex.Message);
            }
        }).WithTags("Settings")
          .RequireAuthorization("VerifiedUser")
          .RequireAuthorization(policy => policy.RequireRole("Owner"))
          .AddEndpointFilter<NonDemoTenantFilter>();

        endpoints.MapGet("/api/capabilities", async (HttpContext context, IPlanLimitService service, CancellationToken ct) =>
            Results.Ok(await service.GetUsageAsync(ShopId(context), ct)))
            .WithTags("Capabilities")
            .RequireAuthorization("VerifiedUser");

        var locations = endpoints.MapGroup("/api/locations")
            .WithTags("Locations")
            .RequireAuthorization("VerifiedUser")
            .AddEndpointFilter<NonDemoTenantFilter>();

        locations.MapGet("/", async (HttpContext context, ICommercialService service, CancellationToken ct) =>
            Results.Ok(await service.GetLocationsAsync(ShopId(context), ct)));

        locations.MapPost("/", async (UpsertLocationRequest request, HttpContext context, ICommercialService service, IPlanLimitService limits, CancellationToken ct) =>
        {
            try
            {
                var shopId = ShopId(context);
                await limits.EnsureCanAddLocationAsync(shopId, ct);
                var location = await service.CreateLocationAsync(shopId, request, ct);
                return Results.Created($"/api/locations/{location.Id}", location);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.LocationInvalid, ex.Message);
            }
        }).RequireAuthorization(policy => policy.RequireRole("Owner"));

        locations.MapPut("/{id:guid}", async (Guid id, UpsertLocationRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try
            {
                var location = await service.UpdateLocationAsync(ShopId(context), id, request, ct);
                return location is null ? Results.NotFound() : Results.Ok(location);
            }
            catch (Exception ex) when (ex is ArgumentException or TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return ApiErrorResults.BadRequest(context, ApiErrorCodes.LocationInvalid, ex.Message);
            }
        }).RequireAuthorization(policy => policy.RequireRole("Owner"));

        var customers = endpoints.MapGroup("/api/customers").WithTags("Customers").RequireAuthorization("VerifiedUser").AddEndpointFilter<NonDemoTenantFilter>();
        customers.MapGet("/", async (string? search, int? take, HttpContext context, ICommercialService service, CancellationToken ct) => Results.Ok(await service.GetCustomersAsync(ShopId(context), search, take ?? 100, ct)));
        customers.MapPost("/", async (UpsertCustomerRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try { return Results.Created("/api/customers", await service.CreateCustomerAsync(ShopId(context), request, ct)); }
            catch (BusinessRuleException ex) { return ApiErrorResults.Conflict(context, ex.Code, ex.Message); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.CustomerInvalid, ex.Message); }
        });
        customers.MapPut("/{id:guid}", async (Guid id, UpsertCustomerRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try { return await service.UpdateCustomerAsync(ShopId(context), id, request, ct) is { } customer ? Results.Ok(customer) : Results.NotFound(); }
            catch (BusinessRuleException ex) { return ApiErrorResults.Conflict(context, ex.Code, ex.Message); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.CustomerInvalid, ex.Message); }
        });

        var payments = endpoints.MapGroup("/api/payments").WithTags("Payments").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist")).AddEndpointFilter<NonDemoTenantFilter>();
        payments.MapGet("/", async (DateTimeOffset? from, DateTimeOffset? to, HttpContext context, ICommercialService service, CancellationToken ct) =>
            Results.Ok(await service.GetPaymentsAsync(ShopId(context), from ?? DateTimeOffset.UtcNow.AddDays(-30), to ?? DateTimeOffset.UtcNow.AddDays(1), ct)));
        payments.MapPost("/", async (CreatePaymentRequest request, HttpContext context, ICommercialService service, ICashManagementService cashService, CancellationToken ct) =>
        {
            try
            {
                var shopId = ShopId(context);
                if (request.Method == PaymentMethod.Cash && await cashService.GetCurrentAsync(shopId, ct) is null)
                    throw new InvalidOperationException("Open a cash session before registering a cash payment.");
                return Results.Created("/api/payments", await service.CreatePaymentAsync(shopId, request, ct));
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.PaymentInvalid, ex.Message); }
        });

        var reports = endpoints.MapGroup("/api/reports").WithTags("Reports").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator")).AddEndpointFilter<NonDemoTenantFilter>();
        reports.MapGet("/business", async (DateOnly? from, DateOnly? to, HttpContext context, ICommercialService service, IPlanLimitService limits, CancellationToken ct) =>
        {
            try
            {
                var shopId = ShopId(context);
                await limits.EnsureCanUseAsync(shopId, PlanFeature.AdvancedReports, ct);
                var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
                return Results.Ok(await service.GetReportAsync(shopId, from ?? end.AddDays(-30), end, ct));
            }
            catch (InvalidOperationException ex) { return ApiErrorResults.Forbidden(context, ApiErrorCodes.PlanFeatureUnavailable, ex.Message); }
        });

        var billing = endpoints.MapGroup("/api/billing").WithTags("Billing").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner")).AddEndpointFilter<NonDemoTenantFilter>();
        billing.MapGet("/subscription", async (HttpContext context, IBillingService service, CancellationToken ct) => Results.Ok(await service.GetSubscriptionAsync(ShopId(context), ct)));
        billing.MapGet("/usage", async (HttpContext context, IPlanLimitService service, CancellationToken ct) => Results.Ok(await service.GetUsageAsync(ShopId(context), ct)));
        billing.MapPost("/checkout", async (CheckoutRequest request, HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CreateCheckoutAsync(ShopId(context), request, ct)); }
            catch (InvalidOperationException ex) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.BillingInvalid, ex.Message); }
        });
        billing.MapPost("/capture", async (CaptureCheckoutRequest request, HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CaptureCheckoutAsync(ShopId(context), request, ct)); }
            catch (InvalidOperationException ex) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.BillingInvalid, ex.Message); }
        });
        billing.MapPost("/cancel", async (bool? atPeriodEnd, HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CancelAsync(ShopId(context), atPeriodEnd ?? true, ct)); }
            catch (InvalidOperationException ex) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.BillingInvalid, ex.Message); }
        });

        endpoints.MapPost("/api/webhooks/paypal", async (HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            using var reader = new StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync(ct);
            try
            {
                await service.HandleWebhookAsync(
                    context.Request.Headers["PAYPAL-TRANSMISSION-ID"].ToString(), context.Request.Headers["PAYPAL-TRANSMISSION-TIME"].ToString(),
                    context.Request.Headers["PAYPAL-CERT-URL"].ToString(), context.Request.Headers["PAYPAL-AUTH-ALGO"].ToString(),
                    context.Request.Headers["PAYPAL-TRANSMISSION-SIG"].ToString(), body, ct);
                return Results.NoContent();
            }
            catch (InvalidOperationException) { return ApiErrorResults.Unauthorized(context, ApiErrorCodes.BillingWebhookInvalid, "The PayPal webhook could not be verified."); }
        }).WithTags("Billing webhooks").RequireRateLimiting("webhooks");

        var audit = endpoints.MapGroup("/api/audit").WithTags("Audit").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator")).AddEndpointFilter<NonDemoTenantFilter>();
        audit.MapGet("/", async (int? take, HttpContext context, IAuditService service, CancellationToken ct) => Results.Ok(await service.GetAsync(ShopId(context), take ?? 100, ct)));
        return endpoints;
    }

    private static Guid ShopId(HttpContext context) => Guid.TryParse(context.User.FindFirst("barbershop_id")?.Value, out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");
}
