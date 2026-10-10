using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class RefreshTokenHardeningTests(BarberTrixFactory factory)
{
    private const string Password = "ValidPass123!";

    [Fact]
    public async Task ReplayInsideGraceWindowIsRejectedWithoutRevokingNewestSession()
    {
        using var client = NewClient(factory);
        var email = await RegisterOwner(client);
        var first = await MobileLogin(client, email);
        var second = await MobileRefresh(client, first.RefreshToken);

        var replay = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = first.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        var third = await MobileRefresh(client, second.RefreshToken);
        Assert.NotEqual(second.RefreshToken, third.RefreshToken);
    }

    [Fact]
    public async Task ReplayOutsideGraceWindowRevokesTheActiveSessionFamily()
    {
        using var custom = WithSettings(("Auth:RefreshReuseGraceSeconds", "0"));
        using var client = NewClient(custom);
        var email = await RegisterOwner(client);
        var first = await MobileLogin(client, email);
        var second = await MobileRefresh(client, first.RefreshToken);

        var replay = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = first.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        var afterReplay = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = second.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, afterReplay.StatusCode);
    }

    [Fact]
    public async Task ParallelRefreshesProduceOneWinnerAndKeepItsSessionUsable()
    {
        using var client = NewClient(factory);
        var email = await RegisterOwner(client);
        var login = await MobileLogin(client, email);

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ =>
            client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = login.RefreshToken })));

        Assert.Equal(1, responses.Count(x => x.StatusCode == HttpStatusCode.OK));
        Assert.Equal(7, responses.Count(x => x.StatusCode == HttpStatusCode.Unauthorized));

        var winnerResponse = Assert.Single(responses.Where(x => x.StatusCode == HttpStatusCode.OK));
        var winner = await winnerResponse.Content.ReadFromJsonAsync<MobilePayload>();
        Assert.NotNull(winner);

        var next = await MobileRefresh(client, winner.RefreshToken);
        Assert.NotEqual(winner.RefreshToken, next.RefreshToken);
    }

    private WebApplicationFactory<Program> WithSettings(params (string Key, string Value)[] settings) =>
        factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(settings.ToDictionary(x => x.Key, x => (string?)x.Value))));

    private static HttpClient NewClient(WebApplicationFactory<Program> source) => source.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = false
    });

    private static async Task<string> RegisterOwner(HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N")[..10];
        var email = $"refresh-hardening-{suffix}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Refresh Hardening {suffix}",
            barberShopSlug = $"refresh-hardening-{suffix}",
            name = $"Owner {suffix}",
            email,
            password = Password,
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        return email;
    }

    private static async Task<MobilePayload> MobileLogin(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/mobile/login", new { email, password = Password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<MobilePayload>())!;
    }

    private static async Task<MobilePayload> MobileRefresh(HttpClient client, string refreshToken)
    {
        var response = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<MobilePayload>())!;
    }

    private sealed record MobilePayload(string AccessToken, string RefreshToken, DateTimeOffset RefreshTokenExpiresAtUtc);
}
