using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class TvDisplayIntegrationTests(BarberTurnFactory factory)
{
    [Fact]
    public async Task PairingCreatesDisplayTokenAndRevocationInvalidatesSession()
    {
        using var client = CreateClient();
        var accessToken = await LoginDemoAsync(client);
        await ConvertDemoToRegularTenantAsync(SubscriptionPlan.Pro);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var created = await client.PostAsJsonAsync("/api/tv/displays", new { name = "Recepción principal" });
        created.EnsureSuccessStatusCode();
        var createdPayload = await created.Content.ReadFromJsonAsync<JsonElement>();
        var displayId = createdPayload.GetProperty("display").GetProperty("id").GetGuid();
        var pairingCode = createdPayload.GetProperty("pairing").GetProperty("code").GetString();
        Assert.False(string.IsNullOrWhiteSpace(pairingCode));

        client.DefaultRequestHeaders.Authorization = null;
        var paired = await client.PostAsJsonAsync("/api/tv/pair", new { code = pairingCode });
        paired.EnsureSuccessStatusCode();
        var pairedPayload = await paired.Content.ReadFromJsonAsync<JsonElement>();
        var displayToken = pairedPayload.GetProperty("displayToken").GetString();
        Assert.False(string.IsNullOrWhiteSpace(displayToken));

        client.DefaultRequestHeaders.Add("X-BarberTrix-TV-Token", displayToken);
        var activeSession = await client.GetAsync("/api/tv/session");
        Assert.Equal(HttpStatusCode.OK, activeSession.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var revoked = await client.DeleteAsync($"/api/tv/displays/{displayId}");
        Assert.Equal(HttpStatusCode.NoContent, revoked.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var revokedSession = await client.GetAsync("/api/tv/session");
        Assert.Equal(HttpStatusCode.Unauthorized, revokedSession.StatusCode);
    }

    [Fact]
    public async Task DowngradingPlanInvalidatesPreviouslyPairedDisplay()
    {
        using var client = CreateClient();
        var accessToken = await LoginDemoAsync(client);
        var shopId = await ConvertDemoToRegularTenantAsync(SubscriptionPlan.Pro);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var created = await client.PostAsJsonAsync("/api/tv/displays", new { name = "TV salón" });
        created.EnsureSuccessStatusCode();
        var createdPayload = await created.Content.ReadFromJsonAsync<JsonElement>();
        var pairingCode = createdPayload.GetProperty("pairing").GetProperty("code").GetString();

        client.DefaultRequestHeaders.Authorization = null;
        var paired = await client.PostAsJsonAsync("/api/tv/pair", new { code = pairingCode });
        paired.EnsureSuccessStatusCode();
        var pairedPayload = await paired.Content.ReadFromJsonAsync<JsonElement>();
        var displayToken = pairedPayload.GetProperty("displayToken").GetString();
        client.DefaultRequestHeaders.Add("X-BarberTrix-TV-Token", displayToken);

        await ChangePlanAsync(shopId, SubscriptionPlan.Free);

        var response = await client.GetAsync("/api/tv/session");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task FreePlanCannotCreateTvDisplay()
    {
        using var client = CreateClient();
        var accessToken = await LoginDemoAsync(client);
        await ConvertDemoToRegularTenantAsync(SubscriptionPlan.Free);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.PostAsJsonAsync("/api/tv/displays", new { name = "TV bloqueada" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorPayload>();
        Assert.NotNull(error);
        Assert.Equal("PLAN_FEATURE_UNAVAILABLE", error.Code);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task<string> LoginDemoAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/auth/demo-login", null);
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        return auth.AccessToken;
    }

    private async Task<Guid> ConvertDemoToRegularTenantAsync(SubscriptionPlan plan)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var shop = await db.BarberShops
            .Where(item => item.Slug.StartsWith("demo-"))
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstAsync();
        shop.ChangeSubscription(plan, SubscriptionStatus.Active);
        var slug = $"tv-test-{Guid.NewGuid():N}";
        await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE [BarberShops] SET [Slug] = {slug} WHERE [Id] = {shop.Id}");
        await db.SaveChangesAsync();
        return shop.Id;
    }

    private async Task ChangePlanAsync(Guid shopId, SubscriptionPlan plan)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var shop = await db.BarberShops.SingleAsync(item => item.Id == shopId);
        shop.ChangeSubscription(plan, SubscriptionStatus.Active);
        await db.SaveChangesAsync();
    }

    private sealed record AuthPayload(string AccessToken);
    private sealed record ApiErrorPayload(string Code, string Message, string CorrelationId);
}
