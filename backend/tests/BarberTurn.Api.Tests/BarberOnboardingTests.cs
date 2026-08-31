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
public sealed class BarberOnboardingTests
{
    private readonly BarberTurnFactory factory;
    public BarberOnboardingTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task IndependentBarberCanRequestJoinAndOwnerCanApprove()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        var suffix = Guid.NewGuid().ToString("N")[..10];
        const string password = "ValidPass123!";

        var ownerResponse = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Stage D {suffix}", barberShopSlug = $"stage-d-{suffix}", name = "Owner Stage D",
            email = $"owner-{suffix}@example.com", password, acceptedTerms = true
        });
        ownerResponse.EnsureSuccessStatusCode();
        var owner = await ownerResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(owner);

        using var barberClient = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        var barberResponse = await barberClient.PostAsJsonAsync("/api/auth/register-barber", new
        {
            name = $"Barber {suffix}", email = $"barber-{suffix}@example.com", password, acceptedTerms = true
        });
        barberResponse.EnsureSuccessStatusCode();
        var barber = await barberResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(barber);
        Assert.Equal("Onboarding", barber.SessionScope);

        barberClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", barber.AccessToken);
        var shops = await barberClient.GetFromJsonAsync<List<ShopItem>>("/api/onboarding/shops?query=Stage%20D");
        var shop = Assert.Single(shops!, x => x.Id == owner.BarberShopId);
        var joinResponse = await barberClient.PostAsync($"/api/onboarding/join-requests/{shop.Id}", null);
        Assert.Equal(HttpStatusCode.Created, joinResponse.StatusCode);
        var join = await joinResponse.Content.ReadFromJsonAsync<JoinPayload>();
        Assert.NotNull(join);
        Assert.Equal("Pending", join.Status);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", owner.AccessToken);
        var pending = await client.GetFromJsonAsync<List<TeamJoinPayload>>("/api/team/join-requests/");
        var pendingRequest = Assert.Single(pending!, x => x.Id == join.Id);
        var approve = await client.PostAsJsonAsync($"/api/team/join-requests/{pendingRequest.Id}/approve", new { chairNumber = 97 });
        Assert.Equal(HttpStatusCode.NoContent, approve.StatusCode);

        var refreshed = await barberClient.PostAsync("/api/auth/refresh", null);
        refreshed.EnsureSuccessStatusCode();
        var tenant = await refreshed.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(tenant);
        Assert.Equal("Tenant", tenant.SessionScope);
        Assert.Equal(shop.Id, tenant.BarberShopId);
        Assert.NotNull(tenant.BarberId);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await db.ShopMemberships.AnyAsync(x => x.UserId == barber.UserId && x.BarberShopId == shop.Id && x.Status == ShopMembershipStatus.Active));
        Assert.True(await db.BarberJoinRequests.AnyAsync(x => x.Id == join.Id && x.Status == BarberJoinRequestStatus.Approved));
    }

    private sealed record AuthPayload(string AccessToken, Guid UserId, Guid? BarberShopId, Guid? BarberId, string SessionScope);
    private sealed record ShopItem(Guid Id, string Name);
    private sealed record JoinPayload(Guid Id, string Status);
    private sealed record TeamJoinPayload(Guid Id, Guid UserId);
}
