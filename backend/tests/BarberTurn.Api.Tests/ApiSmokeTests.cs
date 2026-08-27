using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
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

    private sealed record AuthPayload(string AccessToken);
    private sealed record ShopPayload(string Slug);
    private sealed record CustomerPayload(Guid Id);

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
