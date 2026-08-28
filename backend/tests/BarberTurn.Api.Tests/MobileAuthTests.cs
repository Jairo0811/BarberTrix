using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class MobileAuthTests
{
    private readonly BarberTurnFactory factory;

    public MobileAuthTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task MobileSessionRotatesRefreshTokenAndWebContractKeepsItPrivate()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        var suffix = Guid.NewGuid().ToString("N")[..10];
        var email = $"mobile-{suffix}@example.com";
        const string password = "ValidPass123!";
        var registration = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Mobile QA {suffix}",
            barberShopSlug = $"mobile-qa-{suffix}",
            name = $"Owner {suffix}",
            email,
            password,
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        registration.EnsureSuccessStatusCode();
        var webJson = await registration.Content.ReadAsStringAsync();
        Assert.DoesNotContain("refreshToken", webJson, StringComparison.OrdinalIgnoreCase);

        var login = await client.PostAsJsonAsync("/api/auth/mobile/login", new { email, password });
        login.EnsureSuccessStatusCode();
        Assert.Equal("no-store", login.Headers.CacheControl?.ToString());
        var first = await login.Content.ReadFromJsonAsync<MobileAuthPayload>();
        Assert.NotNull(first);
        Assert.False(string.IsNullOrWhiteSpace(first.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(first.RefreshToken));

        var refresh = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = first.RefreshToken });
        refresh.EnsureSuccessStatusCode();
        var second = await refresh.Content.ReadFromJsonAsync<MobileAuthPayload>();
        Assert.NotNull(second);
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);

        var replay = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = first.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        var logout = await client.PostAsJsonAsync("/api/auth/mobile/logout", new { refreshToken = second.RefreshToken });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var afterLogout = await client.PostAsJsonAsync("/api/auth/mobile/refresh", new { refreshToken = second.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
    }

    private sealed record MobileAuthPayload(string AccessToken, string RefreshToken, DateTimeOffset RefreshTokenExpiresAtUtc);
}
