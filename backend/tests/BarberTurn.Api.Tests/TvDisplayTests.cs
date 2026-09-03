using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class TvDisplayTests
{
    private const string DisplayTokenHeader = "X-BarberTrix-TV-Token";
    private readonly BarberTurnFactory factory;

    public TvDisplayTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task FreePlanCannotCreateTvDisplay()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var response = await client.PostAsJsonAsync("/api/tv/displays", new { name = "Main TV" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProPlanCanPairDisplayAndRevocationInvalidatesToken()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        await SetPlanAsync(auth.Slug, SubscriptionPlan.Pro);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var createdResponse = await client.PostAsJsonAsync("/api/tv/displays", new { name = "Reception TV" });
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<CreateDisplayPayload>();
        Assert.NotNull(created);
        Assert.Matches("^[0-9]{6}$", created.Pairing.Code);

        client.DefaultRequestHeaders.Authorization = null;
        var pairResponse = await client.PostAsJsonAsync("/api/tv/pair", new { code = created.Pairing.Code });
        pairResponse.EnsureSuccessStatusCode();
        var paired = await pairResponse.Content.ReadFromJsonAsync<PairPayload>();
        Assert.NotNull(paired);
        Assert.False(string.IsNullOrWhiteSpace(paired.DisplayToken));

        using var sessionRequest = new HttpRequestMessage(HttpMethod.Get, "/api/tv/session");
        sessionRequest.Headers.Add(DisplayTokenHeader, paired.DisplayToken);
        var sessionResponse = await client.SendAsync(sessionRequest);
        sessionResponse.EnsureSuccessStatusCode();
        var snapshot = await sessionResponse.Content.ReadFromJsonAsync<SnapshotPayload>();
        Assert.NotNull(snapshot);
        Assert.Equal(created.Display.Id, snapshot.DisplayId);
        Assert.Equal("Reception TV", snapshot.DisplayName);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var revokeResponse = await client.DeleteAsync($"/api/tv/displays/{created.Display.Id}");
        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        using var revokedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/tv/session");
        revokedRequest.Headers.Add(DisplayTokenHeader, paired.DisplayToken);
        var revokedResponse = await client.SendAsync(revokedRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, revokedResponse.StatusCode);
    }

    [Fact]
    public async Task DowngradeInvalidatesAlreadyPairedDisplaySession()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        await SetPlanAsync(auth.Slug, SubscriptionPlan.Pro);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var createdResponse = await client.PostAsJsonAsync("/api/tv/displays", new { name = "Waiting Room TV" });
        createdResponse.EnsureSuccessStatusCode();
        var created = await createdResponse.Content.ReadFromJsonAsync<CreateDisplayPayload>();
        Assert.NotNull(created);

        client.DefaultRequestHeaders.Authorization = null;
        var pairResponse = await client.PostAsJsonAsync("/api/tv/pair", new { code = created.Pairing.Code });
        pairResponse.EnsureSuccessStatusCode();
        var paired = await pairResponse.Content.ReadFromJsonAsync<PairPayload>();
        Assert.NotNull(paired);

        using (var validRequest = new HttpRequestMessage(HttpMethod.Get, "/api/tv/session"))
        {
            validRequest.Headers.Add(DisplayTokenHeader, paired.DisplayToken);
            var validResponse = await client.SendAsync(validRequest);
            validResponse.EnsureSuccessStatusCode();
        }

        await SetPlanAsync(auth.Slug, SubscriptionPlan.Free);

        using var downgradedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/tv/session");
        downgradedRequest.Headers.Add(DisplayTokenHeader, paired.DisplayToken);
        var downgradedResponse = await client.SendAsync(downgradedRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, downgradedResponse.StatusCode);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private async Task SetPlanAsync(string slug, SubscriptionPlan plan)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var shop = await db.BarberShops.SingleAsync(item => item.Slug == slug);
        shop.ChangeSubscription(plan, SubscriptionStatus.Active);
        await db.SaveChangesAsync();
    }

    private static async Task<AuthPayload> RegisterOwnerAsync(HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N")[..10];
        var slug = $"tv-test-{suffix}";
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"TV Test {suffix}",
            barberShopSlug = slug,
            name = $"Owner {suffix}",
            email = $"tv-test-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        return auth with { Slug = slug };
    }

    private sealed record AuthPayload(string AccessToken, string Slug = "");
    private sealed record DisplayPayload(Guid Id, string Name);
    private sealed record PairingPayload(string Code);
    private sealed record CreateDisplayPayload(DisplayPayload Display, PairingPayload Pairing);
    private sealed record PairPayload(string DisplayToken);
    private sealed record SnapshotPayload(Guid DisplayId, string DisplayName);
}
