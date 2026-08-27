using System.Data;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Commercial;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BarberTurn.Api.Tests;

public sealed class ApiSmokeTests : IClassFixture<BarberTurnFactory>, IDisposable
{
    private readonly BarberTurnFactory factory;
    private readonly HttpClient client;

    public ApiSmokeTests(BarberTurnFactory factory)
    {
        this.factory = factory;
        client = CreateClient();
    }

    [Fact]
    public async Task DemoTenantCanReachAuthenticatedAndPublicFlows()
    {
        var health = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);

        var demo = await client.PostAsync("/api/auth/demo-login", null);
        demo.EnsureSuccessStatusCode();
        var authentication = await demo.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(authentication);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authentication.AccessToken);
        var settings = await client.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);

        client.DefaultRequestHeaders.Authorization = null;
        var publicShop = await client.GetAsync($"/api/public/shops/{settings.Slug}");
        publicShop.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task RefreshTokenIsHttpOnlyAndNeverReturnedToJavascript()
    {
        var demo = await client.PostAsync("/api/auth/demo-login", null);
        demo.EnsureSuccessStatusCode();

        var json = await demo.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.TryGetProperty("refreshToken", out _));
        Assert.False(json.TryGetProperty("refreshTokenExpiresAtUtc", out _));

        var setCookie = Assert.Single(demo.Headers.GetValues("Set-Cookie"));
        Assert.Contains("barberturn.refresh=", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", setCookie, StringComparison.OrdinalIgnoreCase);

        var refresh = await client.PostAsync("/api/auth/refresh", null);
        refresh.EnsureSuccessStatusCode();
        var refreshedJson = await refresh.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(refreshedJson.TryGetProperty("refreshToken", out _));
    }

    [Fact]
    public async Task LogoutRevokesCookieBackedRefreshSession()
    {
        var demo = await client.PostAsync("/api/auth/demo-login", null);
        demo.EnsureSuccessStatusCode();

        var refreshBeforeLogout = await client.PostAsync("/api/auth/refresh", null);
        refreshBeforeLogout.EnsureSuccessStatusCode();

        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refreshAfterLogout = await client.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshAfterLogout.StatusCode);
    }

    [Fact]
    public async Task TenantCannotUpdateAnotherTenantCustomer()
    {
        using var tenantA = CreateClient();
        using var tenantB = CreateClient();

        await RegisterAndAuthenticateAsync(tenantA, "Tenant A");
        await RegisterAndAuthenticateAsync(tenantB, "Tenant B");

        var created = await tenantA.PostAsJsonAsync("/api/customers", new { name = "Cliente A", phone = "809-555-0101", email = "cliente-a@example.com" });
        created.EnsureSuccessStatusCode();
        var customer = await created.Content.ReadFromJsonAsync<CustomerPayload>();
        Assert.NotNull(customer);

        var crossTenantUpdate = await tenantB.PutAsJsonAsync($"/api/customers/{customer.Id}", new { name = "Intruso", phone = "809-555-9999", email = "intruso@example.com" });
        Assert.Equal(HttpStatusCode.NotFound, crossTenantUpdate.StatusCode);
    }

    [Fact]
    public async Task ResponsesPreserveCorrelationId()
    {
        const string correlationId = "barberturn-test-correlation-001";
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api");
        request.Headers.Add("X-Correlation-ID", correlationId);

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        Assert.True(response.Headers.TryGetValues("X-Correlation-ID", out var values));
        Assert.Equal(correlationId, Assert.Single(values));
    }

    [Fact]
    public async Task InvalidLoginReturnsStableErrorCodeAndCorrelationId()
    {
        const string correlationId = "barberturn-auth-error-001";
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "missing@example.com", password = "WrongPass123!" })
        };
        request.Headers.Add("X-Correlation-ID", correlationId);

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ApiErrorPayload>();
        Assert.NotNull(payload);
        Assert.Equal("AUTH_INVALID_CREDENTIALS", payload.Code);
        Assert.Equal(correlationId, payload.CorrelationId);
        Assert.Equal(correlationId, Assert.Single(response.Headers.GetValues("X-Correlation-ID")));
    }

    [Fact]
    public async Task DuplicateCustomerReturnsStableErrorCodeAndCorrelationId()
    {
        using var tenant = CreateClient();
        await RegisterAndAuthenticateAsync(tenant, "Duplicate Customer Tenant");

        var customer = new { name = "Cliente", phone = "809-555-0110", email = "duplicate-customer@example.com" };
        var created = await tenant.PostAsJsonAsync("/api/customers", customer);
        created.EnsureSuccessStatusCode();

        const string correlationId = "barberturn-customer-error-001";
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/customers")
        {
            Content = JsonContent.Create(customer)
        };
        request.Headers.Add("X-Correlation-ID", correlationId);

        var duplicate = await tenant.SendAsync(request);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var payload = await duplicate.Content.ReadFromJsonAsync<ApiErrorPayload>();
        Assert.NotNull(payload);
        Assert.Equal("CUSTOMER_ALREADY_EXISTS", payload.Code);
        Assert.Equal(correlationId, payload.CorrelationId);
    }

    [Fact]
    public async Task PublicTurnRetriesAreIdempotentAndLookupTokenRemainsValid()
    {
        using var ownerClient = CreateClient();
        var demo = await ownerClient.PostAsync("/api/auth/demo-login", null);
        demo.EnsureSuccessStatusCode();
        var authentication = await demo.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(authentication);

        ownerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authentication.AccessToken);
        var settings = await ownerClient.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);
        ownerClient.DefaultRequestHeaders.Authorization = null;

        var publicShop = await ownerClient.GetFromJsonAsync<PublicShopPayload>($"/api/public/shops/{settings.Slug}");
        Assert.NotNull(publicShop);
        var service = Assert.Single(publicShop.Services.Take(1));
        var idempotencyKey = Guid.NewGuid();
        var request = new
        {
            serviceId = service.Id,
            barberId = (Guid?)null,
            customerName = "Cliente idempotente",
            customerPhone = "809-555-0301",
            idempotencyKey = idempotencyKey.ToString()
        };

        using var firstClient = CreateClient();
        using var secondClient = CreateClient();
        var responses = await Task.WhenAll(
            firstClient.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/turns", request),
            secondClient.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/turns", request));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.Created, response.StatusCode));
        var first = await responses[0].Content.ReadFromJsonAsync<PublicTurnPayload>();
        var second = await responses[1].Content.ReadFromJsonAsync<PublicTurnPayload>();
        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.Equal(first.Turn.Id, second.Turn.Id);
        Assert.Equal(idempotencyKey.ToString("N"), first.LookupToken);
        Assert.Equal(first.LookupToken, second.LookupToken);

        var validLookup = await firstClient.GetAsync($"/api/public/shops/{settings.Slug}/turns/{first.Turn.Id}?token={first.LookupToken}");
        Assert.Equal(HttpStatusCode.OK, validLookup.StatusCode);
        var invalidLookup = await firstClient.GetAsync($"/api/public/shops/{settings.Slug}/turns/{first.Turn.Id}?token={Guid.NewGuid():N}");
        Assert.Equal(HttpStatusCode.NotFound, invalidLookup.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var persistedCount = await db.Turns.CountAsync(x => x.IdempotencyKey == idempotencyKey.ToString("N"));
        Assert.Equal(1, persistedCount);
    }

    [Fact]
    public async Task ConcurrentPublicAppointmentsCannotDoubleBookBarber()
    {
        using var ownerClient = CreateClient();
        var demo = await ownerClient.PostAsync("/api/auth/demo-login", null);
        demo.EnsureSuccessStatusCode();
        var authentication = await demo.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(authentication);

        ownerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authentication.AccessToken);
        var settings = await ownerClient.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);
        ownerClient.DefaultRequestHeaders.Authorization = null;

        var publicShop = await ownerClient.GetFromJsonAsync<PublicShopPayload>($"/api/public/shops/{settings.Slug}");
        Assert.NotNull(publicShop);
        var service = Assert.Single(publicShop.Services.Take(1));
        var barber = Assert.Single(publicShop.Barbers.Take(1));
        var localDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3));
        var availability = await ownerClient.GetFromJsonAsync<List<AvailabilitySlotPayload>>(
            $"/api/public/shops/{settings.Slug}/appointments/availability?serviceId={service.Id}&date={localDate:yyyy-MM-dd}&barberId={barber.Id}");
        Assert.NotNull(availability);
        var slot = Assert.Single(availability.Take(1));

        using var firstClient = CreateClient();
        using var secondClient = CreateClient();
        var firstRequest = firstClient.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/appointments", new
        {
            serviceId = service.Id,
            barberId = barber.Id,
            startsAt = slot.StartsAtUtc,
            customerName = "Cliente simultáneo A",
            customerPhone = "809-555-0201",
            customerEmail = "simultaneo-a@example.com"
        });
        var secondRequest = secondClient.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/appointments", new
        {
            serviceId = service.Id,
            barberId = barber.Id,
            startsAt = slot.StartsAtUtc,
            customerName = "Cliente simultáneo B",
            customerPhone = "809-555-0202",
            customerEmail = "simultaneo-b@example.com"
        });

        var responses = await Task.WhenAll(firstRequest, secondRequest);
        var createdCount = responses.Count(response => response.StatusCode == HttpStatusCode.Created);
        var conflictCount = responses.Count(response => response.StatusCode == HttpStatusCode.Conflict);
        if (createdCount != 1 || conflictCount != 1)
        {
            var diagnostics = await Task.WhenAll(responses.Select(async response => $"{(int)response.StatusCode} {response.StatusCode}: {await response.Content.ReadAsStringAsync()}"));
            Assert.Fail($"Expected one 201 Created and one 409 Conflict. Actual responses: {string.Join(" | ", diagnostics)}");
        }

        var conflict = Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        var payload = await conflict.Content.ReadFromJsonAsync<ApiErrorPayload>();
        Assert.NotNull(payload);
        Assert.Equal("APPOINTMENT_TIME_UNAVAILABLE", payload.Code);
    }

    [Fact]
    public async Task PayPalWebhooksAreIdempotentAndIgnoreOlderEvents()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var suffix = Guid.NewGuid().ToString("N");
        var providerSubscriptionId = $"I-TEST-{suffix}";
        var shop = new BarberShop($"PayPal Test {suffix[..8]}", $"paypal-test-{suffix}");
        shop.ChangeSubscription(SubscriptionPlan.Pro, SubscriptionStatus.Active);
        var subscription = new Subscription(shop.Id, SubscriptionPlan.Pro, "PayPal", providerSubscriptionId, DateTimeOffset.UtcNow.AddDays(-5), DateTimeOffset.UtcNow.AddDays(25));
        db.BarberShops.Add(shop);
        db.Subscriptions.Add(subscription);
        await db.SaveChangesAsync();

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PayPal:ClientId"] = "test-client",
            ["PayPal:Secret"] = "test-secret",
            ["PayPal:WebhookId"] = "test-webhook",
            ["PayPal:Sandbox"] = "true"
        }).Build();
        using var httpClient = new HttpClient(new PayPalStubHandler());
        var billing = new PayPalBillingService(httpClient, db, configuration, NullLogger<PayPalBillingService>.Instance);
        var cancelledAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        var cancelledEvent = CreatePayPalWebhook("WH-CANCEL-" + suffix, "BILLING.SUBSCRIPTION.CANCELLED", providerSubscriptionId, cancelledAt);

        await billing.HandleWebhookAsync("transmission-1", cancelledAt.ToString("O"), "https://example.test/cert", "SHA256withRSA", "signature", cancelledEvent);
        await billing.HandleWebhookAsync("transmission-1", cancelledAt.ToString("O"), "https://example.test/cert", "SHA256withRSA", "signature", cancelledEvent);

        var olderActivatedAt = cancelledAt.AddMinutes(-10);
        var olderActivatedEvent = CreatePayPalWebhook("WH-ACTIVATE-" + suffix, "BILLING.SUBSCRIPTION.ACTIVATED", providerSubscriptionId, olderActivatedAt);
        await billing.HandleWebhookAsync("transmission-2", olderActivatedAt.ToString("O"), "https://example.test/cert", "SHA256withRSA", "signature", olderActivatedEvent);

        db.ChangeTracker.Clear();
        var persisted = await db.Subscriptions.SingleAsync(x => x.ProviderSubscriptionId == providerSubscriptionId);
        Assert.Equal(SubscriptionStatus.Cancelled, persisted.Status);

        var receiptStats = await ReadWebhookReceiptStatsAsync(db, providerSubscriptionId);
        Assert.Equal(2, receiptStats.Total);
        Assert.Equal(1, receiptStats.Applied);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task RegisterAndAuthenticateAsync(HttpClient httpClient, string shopName)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var response = await httpClient.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = shopName,
            barberShopSlug = $"{shopName.ToLowerInvariant().Replace(' ', '-')}-{suffix}",
            name = $"Owner {suffix}",
            email = $"owner-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
    }

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

    private static async Task<WebhookReceiptStats> ReadWebhookReceiptStatsAsync(ApplicationDbContext db, string providerSubscriptionId)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*), COALESCE(SUM(CASE WHEN [WasApplied] = 1 THEN 1 ELSE 0 END), 0) FROM [PayPalWebhookReceipts] WHERE [ProviderResourceId] = @providerResourceId;";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "@providerResourceId";
        parameter.DbType = DbType.String;
        parameter.Size = 180;
        parameter.Value = providerSubscriptionId;
        command.Parameters.Add(parameter);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return new WebhookReceiptStats(reader.GetInt32(0), reader.GetInt32(1));
    }

    private sealed record AuthPayload(string AccessToken);
    private sealed record ShopPayload(string Slug);
    private sealed record CustomerPayload(Guid Id);
    private sealed record ApiErrorPayload(string Code, string Message, string CorrelationId);
    private sealed record PublicShopPayload(IReadOnlyList<ServicePayload> Services, IReadOnlyList<BarberPayload> Barbers);
    private sealed record ServicePayload(Guid Id);
    private sealed record BarberPayload(Guid Id);
    private sealed record AvailabilitySlotPayload(DateTimeOffset StartsAtUtc);
    private sealed record PublicTurnPayload(PublicTurnIdentityPayload Turn, string LookupToken);
    private sealed record PublicTurnIdentityPayload(Guid Id);
    private sealed record WebhookReceiptStats(int Total, int Applied);

    private sealed class PayPalStubHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var payload = request.RequestUri?.AbsolutePath switch
            {
                "/v1/oauth2/token" => "{\"access_token\":\"test-access-token\"}",
                "/v1/notifications/verify-webhook-signature" => "{\"verification_status\":\"SUCCESS\"}",
                _ => throw new InvalidOperationException($"Unexpected PayPal test request: {request.RequestUri}")
            };
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json")
            });
        }
    }

    public void Dispose() => client.Dispose();
}

public sealed class BarberTurnFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var connectionString = Environment.GetEnvironmentVariable("BARBERTURN_TEST_CONNECTION")
            ?? throw new InvalidOperationException("BARBERTURN_TEST_CONNECTION is required for API integration tests.");
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = connectionString,
            ["Database:ApplyMigrations"] = "true",
            ["Demo:Enabled"] = "true",
            ["Auth:RequireVerifiedEmail"] = "false",
            ["Email:Enabled"] = "false",
            ["HumanVerification:Enabled"] = "false"
        }));
    }
}
