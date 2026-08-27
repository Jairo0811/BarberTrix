using BarberTurn.Api.Filters;
using BarberTurn.Application.Commercial;
using BarberTurn.Application.Common;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using BarberTurn.Domain.Entities;

namespace BarberTurn.Api.Endpoints;

public static class CommercialEndpoints
{
    public static IEndpointRouteBuilder MapCommercialEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/shop/settings", async (HttpContext context, ApplicationDbContext db, CancellationToken ct) =>
        {
            var shopId = ShopId(context);
            var shop = await db.BarberShops.AsNoTracking().Where(x => x.Id == shopId).Select(x => new { x.Id, x.Name, x.Slug, x.TimeZoneId, x.Plan, x.SubscriptionStatus, x.TrialEndsAtUtc }).SingleAsync(ct);
            return Results.Ok(shop);
        }).WithTags("Settings").RequireAuthorization("VerifiedUser");

        endpoints.MapPut("/api/shop/settings", async (UpdateShopSettingsRequest request, HttpContext context, ApplicationDbContext db, CancellationToken ct) =>
        {
            try
            {
                _ = TimeZoneInfo.FindSystemTimeZoneById(request.TimeZoneId);
                var shop = await db.BarberShops.SingleAsync(x => x.Id == ShopId(context), ct);
                shop.UpdateSettings(request.Name, request.TimeZoneId);
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            }
            catch (Exception ex) when (ex is ArgumentException or TimeZoneNotFoundException or InvalidTimeZoneException) { return Results.BadRequest(new { message = ex.Message }); }
        }).WithTags("Settings").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner")).AddEndpointFilter<NonDemoTenantFilter>();

        endpoints.MapGet("/api/capabilities", async (HttpContext context, IPlanLimitService service, CancellationToken ct) =>
            Results.Ok(await service.GetUsageAsync(ShopId(context), ct)))
            .WithTags("Capabilities")
            .RequireAuthorization("VerifiedUser");

        var locations = endpoints.MapGroup("/api/locations").WithTags("Locations").RequireAuthorization("VerifiedUser").AddEndpointFilter<NonDemoTenantFilter>();
        locations.MapGet("/", async (HttpContext context, ApplicationDbContext db, CancellationToken ct) =>
            Results.Ok(await db.ShopLocations.AsNoTracking().Where(x => x.BarberShopId == ShopId(context)).OrderBy(x => x.Name).ToListAsync(ct)));
        locations.MapPost("/", async (UpsertLocationRequest request, HttpContext context, ApplicationDbContext db, IPlanLimitService limits, CancellationToken ct) =>
        {
            try
            {
                var shopId = ShopId(context);
                await limits.EnsureCanAddLocationAsync(shopId, ct);
                var location = new ShopLocation(shopId, request.Name, request.Slug, request.Address, request.TimeZoneId);
                db.ShopLocations.Add(location); await db.SaveChangesAsync(ct);
                return Results.Created($"/api/locations/{location.Id}", location);
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or TimeZoneNotFoundException or InvalidTimeZoneException or DbUpdateException) { return Results.BadRequest(new { message = ex.Message }); }
        }).RequireAuthorization(policy => policy.RequireRole("Owner"));
        locations.MapPut("/{id:guid}", async (Guid id, UpsertLocationRequest request, HttpContext context, ApplicationDbContext db, CancellationToken ct) =>
        {
            try
            {
                var location = await db.ShopLocations.SingleOrDefaultAsync(x => x.Id == id && x.BarberShopId == ShopId(context), ct);
                if (location is null) return Results.NotFound();
                location.Update(request.Name, request.Slug, request.Address, request.TimeZoneId); await db.SaveChangesAsync(ct);
                return Results.Ok(location);
            }
            catch (Exception ex) when (ex is ArgumentException or TimeZoneNotFoundException or InvalidTimeZoneException or DbUpdateException) { return Results.BadRequest(new { message = ex.Message }); }
        }).RequireAuthorization(policy => policy.RequireRole("Owner"));

        var customers = endpoints.MapGroup("/api/customers").WithTags("Customers").RequireAuthorization("VerifiedUser").AddEndpointFilter<NonDemoTenantFilter>();
        customers.MapGet("/", async (string? search, int? take, HttpContext context, ICommercialService service, CancellationToken ct) => Results.Ok(await service.GetCustomersAsync(ShopId(context), search, take ?? 100, ct)));
        customers.MapPost("/", async (UpsertCustomerRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try { return Results.Created("/api/customers", await service.CreateCustomerAsync(ShopId(context), request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
        });
        customers.MapPut("/{id:guid}", async (Guid id, UpsertCustomerRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try { return await service.UpdateCustomerAsync(ShopId(context), id, request, ct) is { } customer ? Results.Ok(customer) : Results.NotFound(); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
        });

        var payments = endpoints.MapGroup("/api/payments").WithTags("Payments").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator", "Receptionist")).AddEndpointFilter<NonDemoTenantFilter>();
        payments.MapGet("/", async (DateTimeOffset? from, DateTimeOffset? to, HttpContext context, ICommercialService service, CancellationToken ct) =>
            Results.Ok(await service.GetPaymentsAsync(ShopId(context), from ?? DateTimeOffset.UtcNow.AddDays(-30), to ?? DateTimeOffset.UtcNow.AddDays(1), ct)));
        payments.MapPost("/", async (CreatePaymentRequest request, HttpContext context, ICommercialService service, CancellationToken ct) =>
        {
            try { return Results.Created("/api/payments", await service.CreatePaymentAsync(ShopId(context), request, ct)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
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
            catch (InvalidOperationException ex) { return Results.StatusCode(StatusCodes.Status403Forbidden); }
        });

        var billing = endpoints.MapGroup("/api/billing").WithTags("Billing").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner")).AddEndpointFilter<NonDemoTenantFilter>();
        billing.MapGet("/subscription", async (HttpContext context, IBillingService service, CancellationToken ct) => Results.Ok(await service.GetSubscriptionAsync(ShopId(context), ct)));
        billing.MapGet("/usage", async (HttpContext context, IPlanLimitService service, CancellationToken ct) => Results.Ok(await service.GetUsageAsync(ShopId(context), ct)));
        billing.MapPost("/checkout", async (CheckoutRequest request, HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CreateCheckoutAsync(ShopId(context), request, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
        });
        billing.MapPost("/capture", async (CaptureCheckoutRequest request, HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CaptureCheckoutAsync(ShopId(context), request, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
        });
        billing.MapPost("/cancel", async (bool? atPeriodEnd, HttpContext context, IBillingService service, CancellationToken ct) =>
        {
            try { return Results.Ok(await service.CancelAsync(ShopId(context), atPeriodEnd ?? true, ct)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { message = ex.Message }); }
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
            catch (InvalidOperationException) { return Results.Unauthorized(); }
        }).WithTags("Billing webhooks").RequireRateLimiting("webhooks");

        var audit = endpoints.MapGroup("/api/audit").WithTags("Audit").RequireAuthorization("VerifiedUser").RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator")).AddEndpointFilter<NonDemoTenantFilter>();
        audit.MapGet("/", async (int? take, HttpContext context, IAuditService service, CancellationToken ct) => Results.Ok(await service.GetAsync(ShopId(context), take ?? 100, ct)));
        return endpoints;
    }

    private static Guid ShopId(HttpContext context) => Guid.TryParse(context.User.FindFirst("barbershop_id")?.Value, out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");
}

public sealed record UpdateShopSettingsRequest(string Name, string TimeZoneId);
public sealed record UpsertLocationRequest(string Name, string Slug, string? Address, string TimeZoneId);
