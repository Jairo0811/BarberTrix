using System.Data;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Commercial;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class WebV1FinalQaTests
{
    private readonly BarberTurnFactory factory;

    public WebV1FinalQaTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task InvalidPayPalSignatureIsRejectedWithoutChangingSubscription()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var suffix = Guid.NewGuid().ToString("N");
        var providerSubscriptionId = $"I-INVALID-{suffix}";
        var shop = new BarberShop($"Invalid PayPal {suffix[..8]}", $"invalid-paypal-{suffix}");
        shop.ChangeSubscription(SubscriptionPlan.Pro, SubscriptionStatus.Active);
        var subscription = new Subscription(
            shop.Id,
            SubscriptionPlan.Pro,
            "PayPal",
            providerSubscriptionId,
            DateTimeOffset.UtcNow.AddDays(-2),
            DateTimeOffset.UtcNow.AddDays(28));
        db.BarberShops.Add(shop);
        db.Subscriptions.Add(subscription);
        await db.SaveChangesAsync();

        var configuration = BuildPayPalConfiguration();
        using var httpClient = new HttpClient(new PayPalVerificationStubHandler("FAILURE"));
        var billing = new PayPalBillingService(httpClient, db, configuration, NullLogger<PayPalBillingService>.Instance);
        var occurredAt = DateTimeOffset.UtcNow;
        var body = CreatePayPalWebhook($"WH-INVALID-{suffix}", "BILLING.SUBSCRIPTION.CANCELLED", providerSubscriptionId, occurredAt);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => billing.HandleWebhookAsync(
            "invalid-transmission",
            occurredAt.ToString("O"),
            "https://example.test/cert",
            "SHA256withRSA",
            "invalid-signature",
            body));

        Assert.Equal("Invalid PayPal webhook signature.", exception.Message);
        db.ChangeTracker.Clear();
        var persisted = await db.Subscriptions.SingleAsync(x => x.ProviderSubscriptionId == providerSubscriptionId);
        Assert.Equal(SubscriptionStatus.Active, persisted.Status);
        Assert.Equal(0, await CountWebhookReceiptsAsync(db, providerSubscriptionId));
    }

    [Fact]
    public async Task PublicAppointmentAvailabilityUsesShopTimezoneAndBookingWindow()
    {
        var setup = await CreatePublicProShopAsync("America/Santo_Domingo");
        using var client = CreateClient();
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(setup.TimeZoneId);
        var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow.AddDays(3), timeZone).DateTime);

        var slots = await client.GetFromJsonAsync<List<AvailabilitySlotPayload>>(
            $"/api/public/shops/{setup.Slug}/appointments/availability?serviceId={setup.ServiceId}&date={localDate:yyyy-MM-dd}&barberId={setup.BarberId}");

        Assert.NotNull(slots);
        Assert.NotEmpty(slots);
        Assert.All(slots, slot =>
        {
            var localStart = TimeZoneInfo.ConvertTime(slot.StartsAtUtc, timeZone);
            var localEnd = TimeZoneInfo.ConvertTime(slot.EndsAtUtc, timeZone);
            Assert.Equal(localDate, DateOnly.FromDateTime(localStart.DateTime));
            Assert.Equal(localDate, DateOnly.FromDateTime(localEnd.DateTime));
            Assert.True(localStart.TimeOfDay >= TimeSpan.FromHours(9));
            Assert.True(localEnd.TimeOfDay <= TimeSpan.FromHours(19));
            Assert.Equal(0, localStart.Minute % 30);
        });

        var invalidLocalStart = localDate.ToDateTime(new TimeOnly(8, 30), DateTimeKind.Unspecified);
        var invalidStartUtc = new DateTimeOffset(invalidLocalStart, timeZone.GetUtcOffset(invalidLocalStart)).ToUniversalTime();
        var invalid = await client.PostAsJsonAsync($"/api/public/shops/{setup.Slug}/appointments", new
        {
            serviceId = setup.ServiceId,
            barberId = setup.BarberId,
            startsAt = invalidStartUtc,
            customerName = "Fuera de horario",
            customerPhone = "809-555-0601",
            customerEmail = "fuera-horario@example.com"
        });

        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var error = await invalid.Content.ReadFromJsonAsync<ApiErrorPayload>();
        Assert.NotNull(error);
        Assert.Equal("APPOINTMENT_INVALID", error.Code);
    }

    [Fact]
    public async Task PublicAppointmentRequiresOpaqueTokenForLookupAndCancellation()
    {
        var setup = await CreatePublicProShopAsync("America/Santo_Domingo");
        using var client = CreateClient();
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(setup.TimeZoneId);
        var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow.AddDays(4), timeZone).DateTime);
        var slots = await client.GetFromJsonAsync<List<AvailabilitySlotPayload>>(
            $"/api/public/shops/{setup.Slug}/appointments/availability?serviceId={setup.ServiceId}&date={localDate:yyyy-MM-dd}&barberId={setup.BarberId}");
        var slot = Assert.Single(Assert.IsAssignableFrom<IEnumerable<AvailabilitySlotPayload>>(slots).Take(1));

        var createdResponse = await client.PostAsJsonAsync($"/api/public/shops/{setup.Slug}/appointments", new
        {
            serviceId = setup.ServiceId,
            barberId = setup.BarberId,
            startsAt = slot.StartsAtUtc,
            customerName = "Cliente token",
            customerPhone = "809-555-0602",
            customerEmail = "token@example.com"
        });
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<PublicAppointmentPayload>();
        Assert.NotNull(created);
        Assert.False(string.IsNullOrWhiteSpace(created.LookupToken));

        var invalidToken = Guid.NewGuid().ToString("N");
        var invalidLookup = await client.GetAsync($"/api/public/shops/{setup.Slug}/appointments/{created.Appointment.Id}?token={invalidToken}");
        Assert.Equal(HttpStatusCode.NotFound, invalidLookup.StatusCode);
        var validLookup = await client.GetAsync($"/api/public/shops/{setup.Slug}/appointments/{created.Appointment.Id}?token={created.LookupToken}");
        Assert.Equal(HttpStatusCode.OK, validLookup.StatusCode);

        var invalidCancel = await client.DeleteAsync($"/api/public/shops/{setup.Slug}/appointments/{created.Appointment.Id}?token={invalidToken}");
        Assert.Equal(HttpStatusCode.NotFound, invalidCancel.StatusCode);
        var validCancel = await client.DeleteAsync($"/api/public/shops/{setup.Slug}/appointments/{created.Appointment.Id}?token={created.LookupToken}");
        Assert.Equal(HttpStatusCode.NoContent, validCancel.StatusCode);

        var cancelledLookup = await client.GetAsync($"/api/public/shops/{setup.Slug}/appointments/{created.Appointment.Id}?token={created.LookupToken}");
        cancelledLookup.EnsureSuccessStatusCode();
        var cancelled = await cancelledLookup.Content.ReadFromJsonAsync<AppointmentPayload>();
        Assert.NotNull(cancelled);
        Assert.Equal("Cancelled", cancelled.Status);
    }

    [Fact]
    public async Task QueueMutationsAreIsolatedBetweenTenants()
    {
        using var tenantA = CreateClient();
        using var tenantB = CreateClient();
        var authA = await RegisterAndAuthenticateAsync(tenantA, "Queue Tenant A");
        _ = await RegisterAndAuthenticateAsync(tenantB, "Queue Tenant B");

        var barberResponse = await tenantA.PostAsJsonAsync("/api/queue/barbers", new { name = "Barber A", chairNumber = 1 });
        barberResponse.EnsureSuccessStatusCode();
        var barber = await barberResponse.Content.ReadFromJsonAsync<BarberPayload>();
        Assert.NotNull(barber);

        var serviceResponse = await tenantA.PostAsJsonAsync("/api/queue/services", new { name = "Corte A", price = 500m, estimatedDurationMinutes = 30, description = "Tenant isolation" });
        serviceResponse.EnsureSuccessStatusCode();
        var service = await serviceResponse.Content.ReadFromJsonAsync<ServicePayload>();
        Assert.NotNull(service);

        var turnResponse = await tenantA.PostAsJsonAsync("/api/queue/turns", new { serviceId = service.Id, customerName = "Cliente A", barberId = (Guid?)null, customerPhone = "809-555-0603" });
        turnResponse.EnsureSuccessStatusCode();
        var turn = await turnResponse.Content.ReadFromJsonAsync<TurnPayload>();
        Assert.NotNull(turn);

        var crossTenantCancel = await tenantB.PostAsync($"/api/queue/turns/{turn.Id}/cancel", null);
        Assert.Equal(HttpStatusCode.NotFound, crossTenantCancel.StatusCode);
        var crossTenantCall = await tenantB.PostAsync($"/api/queue/turns/{turn.Id}/call/{barber.Id}", null);
        Assert.Equal(HttpStatusCode.NotFound, crossTenantCall.StatusCode);

        tenantA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA.AccessToken);
        var queue = await tenantA.GetFromJsonAsync<List<TurnPayload>>("/api/queue/turns");
        Assert.NotNull(queue);
        var persisted = Assert.Single(queue, item => item.Id == turn.Id);
        Assert.Equal("Waiting", persisted.Status);
    }

    [Fact]
    public async Task ConcurrentCallsCannotAssignOneBarberToTwoTurns()
    {
        using var owner = CreateClient();
        var auth = await RegisterAndAuthenticateAsync(owner, "Concurrent Queue");

        var barberResponse = await owner.PostAsJsonAsync("/api/queue/barbers", new { name = "Concurrent Barber", chairNumber = 1 });
        barberResponse.EnsureSuccessStatusCode();
        var barber = await barberResponse.Content.ReadFromJsonAsync<BarberPayload>();
        Assert.NotNull(barber);

        var serviceResponse = await owner.PostAsJsonAsync("/api/queue/services", new { name = "Concurrent Cut", price = 650m, estimatedDurationMinutes = 30, description = "Concurrency" });
        serviceResponse.EnsureSuccessStatusCode();
        var service = await serviceResponse.Content.ReadFromJsonAsync<ServicePayload>();
        Assert.NotNull(service);

        var firstTurnResponse = await owner.PostAsJsonAsync("/api/queue/turns", new { serviceId = service.Id, customerName = "Concurrent A", barberId = (Guid?)null });
        var secondTurnResponse = await owner.PostAsJsonAsync("/api/queue/turns", new { serviceId = service.Id, customerName = "Concurrent B", barberId = (Guid?)null });
        firstTurnResponse.EnsureSuccessStatusCode();
        secondTurnResponse.EnsureSuccessStatusCode();
        var firstTurn = await firstTurnResponse.Content.ReadFromJsonAsync<TurnPayload>();
        var secondTurn = await secondTurnResponse.Content.ReadFromJsonAsync<TurnPayload>();
        Assert.NotNull(firstTurn);
        Assert.NotNull(secondTurn);

        using var firstClient = CreateClient();
        using var secondClient = CreateClient();
        firstClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        secondClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var responses = await Task.WhenAll(
            firstClient.PostAsync($"/api/queue/turns/{firstTurn.Id}/call/{barber.Id}", null),
            secondClient.PostAsync($"/api/queue/turns/{secondTurn.Id}/call/{barber.Id}", null));

        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.OK));
        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));

        var queue = await owner.GetFromJsonAsync<List<TurnPayload>>("/api/queue/turns");
        Assert.NotNull(queue);
        var testedTurns = queue.Where(item => item.Id == firstTurn.Id || item.Id == secondTurn.Id).ToList();
        Assert.Equal(2, testedTurns.Count);
        Assert.Equal(1, testedTurns.Count(item => item.Status == "Called"));
        Assert.Equal(1, testedTurns.Count(item => item.Status == "Waiting"));
    }

    [Fact]
    public async Task PublicQueueDoesNotExposeCustomerContactTokensOrInternalTurnIds()
    {
        var setup = await CreatePublicProShopAsync("America/Santo_Domingo");
        using var client = CreateClient();
        var create = await client.PostAsJsonAsync($"/api/public/shops/{setup.Slug}/turns", new
        {
            serviceId = setup.ServiceId,
            barberId = setup.BarberId,
            customerName = "Nombre privado",
            customerPhone = "809-555-0604",
            idempotencyKey = Guid.NewGuid().ToString()
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var queue = await client.GetAsync($"/api/public/shops/{setup.Slug}/queue");
        queue.EnsureSuccessStatusCode();
        var json = await queue.Content.ReadAsStringAsync();
        Assert.False(json.Contains("customerName", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("customerPhone", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("lookupToken", StringComparison.OrdinalIgnoreCase));
        Assert.False(json.Contains("\"id\"", StringComparison.OrdinalIgnoreCase));
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private async Task<PublicShopSetup> CreatePublicProShopAsync(string timeZoneId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var suffix = Guid.NewGuid().ToString("N");
        var shop = new BarberShop($"QA Shop {suffix[..8]}", $"qa-shop-{suffix}", timeZoneId);
        shop.ChangeSubscription(SubscriptionPlan.Pro, SubscriptionStatus.Active);
        var barber = new Barber(shop.Id, $"QA Barber {suffix[..6]}", 1);
        var service = new BarberService(shop.Id, $"QA Service {suffix[..6]}", 500m, 30, "Web v1 final QA");
        db.BarberShops.Add(shop);
        db.Barbers.Add(barber);
        db.BarberServices.Add(service);
        await db.SaveChangesAsync();
        return new PublicShopSetup(shop.Slug, service.Id, barber.Id, shop.TimeZoneId);
    }

    private static async Task<AuthPayload> RegisterAndAuthenticateAsync(HttpClient client, string shopName)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = shopName,
            barberShopSlug = $"{shopName.ToLowerInvariant().Replace(' ', '-')}-{suffix}",
            name = $"Owner {suffix}",
            email = $"qa-owner-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return auth;
    }

    private static IConfiguration BuildPayPalConfiguration() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PayPal:ClientId"] = "test-client",
            ["PayPal:Secret"] = "test-secret",
            ["PayPal:WebhookId"] = "test-webhook",
            ["PayPal:Sandbox"] = "true"
        })
        .Build();

    private static string CreatePayPalWebhook(string eventId, string eventType, string providerSubscriptionId, DateTimeOffset occurredAt) =>
        JsonSerializer.Serialize(new
        {
            id = eventId,
            event_type = eventType,
            create_time = occurredAt.ToString("O"),
            resource = new
            {
                id = providerSubscriptionId,
                start_time = occurredAt.ToString("O"),
                billing_info = new { next_billing_time = occurredAt.AddMonths(1).ToString("O") }
            }
        });

    private static async Task<int> CountWebhookReceiptsAsync(ApplicationDbContext db, string providerSubscriptionId)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM [PayPalWebhookReceipts] WHERE [ProviderResourceId] = @providerResourceId;";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "@providerResourceId";
        parameter.DbType = DbType.String;
        parameter.Size = 180;
        parameter.Value = providerSubscriptionId;
        command.Parameters.Add(parameter);
        return Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
    }

    private sealed record PublicShopSetup(string Slug, Guid ServiceId, Guid BarberId, string TimeZoneId);
    private sealed record AuthPayload(string AccessToken);
    private sealed record ApiErrorPayload(string Code);
    private sealed record BarberPayload(Guid Id);
    private sealed record ServicePayload(Guid Id);
    private sealed record TurnPayload(Guid Id, string Status);
    private sealed record AvailabilitySlotPayload(DateTimeOffset StartsAtUtc, DateTimeOffset EndsAtUtc);
    private sealed record PublicAppointmentPayload(AppointmentPayload Appointment, string LookupToken);
    private sealed record AppointmentPayload(Guid Id, string Status);

    private sealed class PayPalVerificationStubHandler(string verificationStatus) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var payload = request.RequestUri?.AbsolutePath switch
            {
                "/v1/oauth2/token" => "{\"access_token\":\"test-access-token\"}",
                "/v1/notifications/verify-webhook-signature" => $"{{\"verification_status\":\"{verificationStatus}\"}}",
                _ => throw new InvalidOperationException($"Unexpected PayPal test request: {request.RequestUri}")
            };
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            });
        }
    }
}
