using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BarberTurn.Api.Tests;

public sealed class ApiSmokeTests : IClassFixture<BarberTurnFactory>, IDisposable
{
    private readonly HttpClient client;

    public ApiSmokeTests(BarberTurnFactory factory) => client = factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false
    });

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

    private sealed record AuthPayload(string AccessToken);
    private sealed record ShopPayload(string Slug);

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
            ["Jwt:Issuer"] = "BarberTurn.Api.Tests",
            ["Jwt:Audience"] = "BarberTurn.Api.Tests",
            ["Jwt:Key"] = "integration-tests-only-jwt-key-with-at-least-sixty-four-characters-2026",
            ["Database:ApplyMigrations"] = "true",
            ["Demo:Enabled"] = "true",
            ["Auth:RequireVerifiedEmail"] = "false",
            ["Email:Enabled"] = "false",
            ["HumanVerification:Enabled"] = "false"
        }));
    }
}
