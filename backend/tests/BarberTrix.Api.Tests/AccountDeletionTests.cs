using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class AccountDeletionTests
{
    private readonly BarberTrixFactory factory;

    public AccountDeletionTests(BarberTrixFactory factory) => this.factory = factory;

    [Fact]
    public async Task DeleteAccountRequiresExplicitConfirmation()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        using var request = DeletionRequest("NO");
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await db.Users.AsNoTracking().AnyAsync(x => x.Id == auth.UserId && x.IsActive));
    }

    [Fact]
    public async Task OwnerDeletionAnonymizesIdentityClosesWorkspaceAndRevokesAllSessionsImmediately()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        // A rejected confirmation still passes authentication, warming the positive JWT cache
        // without requiring email verification or mutating the account.
        using var warmRequest = DeletionRequest("NO");
        using var warmResponse = await client.SendAsync(warmRequest);
        Assert.Equal(HttpStatusCode.BadRequest, warmResponse.StatusCode);

        using var request = DeletionRequest("DELETE");
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var deletion = await response.Content.ReadFromJsonAsync<DeletionPayload>();
        Assert.NotNull(deletion);
        Assert.True(deletion.WorkspaceClosed);
        Assert.False(deletion.SubscriptionCancelled);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(x => x.Id == auth.UserId);
        var shop = await db.BarberShops.AsNoTracking().SingleAsync(x => x.Id == auth.BarberShopId);

        Assert.False(user.IsActive);
        Assert.Null(user.BarberShopId);
        Assert.StartsWith("deleted-", user.Email, StringComparison.Ordinal);
        Assert.EndsWith("@users.invalid", user.Email, StringComparison.Ordinal);
        Assert.False(shop.IsActive);
        Assert.False(await db.RefreshSessions.AsNoTracking().AnyAsync(x => x.UserId == auth.UserId));

        using var oldTokenRequest = DeletionRequest("NO");
        using var oldAccessToken = await client.SendAsync(oldTokenRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, oldAccessToken.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var mobileLogin = await client.PostAsJsonAsync("/api/auth/mobile/login", new
        {
            email = auth.Email,
            password = "ValidPass123!"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, mobileLogin.StatusCode);
    }

    private static HttpRequestMessage DeletionRequest(string confirmation) => new(HttpMethod.Delete, "/api/account")
    {
        Content = JsonContent.Create(new { confirmation })
    };

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task<AuthPayload> RegisterOwnerAsync(HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N")[..10];
        var email = $"delete-{suffix}@example.com";
        using var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Delete QA {suffix}",
            barberShopSlug = $"delete-qa-{suffix}",
            name = $"Owner {suffix}",
            email,
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<AuthResponsePayload>();
        Assert.NotNull(payload);
        Assert.NotNull(payload.BarberShopId);
        return new AuthPayload(payload.AccessToken, payload.UserId, payload.BarberShopId.Value, email);
    }

    private sealed record AuthPayload(string AccessToken, Guid UserId, Guid BarberShopId, string Email);
    private sealed record AuthResponsePayload(string AccessToken, Guid UserId, Guid? BarberShopId);
    private sealed record DeletionPayload(bool WorkspaceClosed, bool SubscriptionCancelled);
}
