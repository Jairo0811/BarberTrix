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
public sealed class FreePlanEntitlementTests
{
    private readonly BarberTurnFactory factory;

    public FreePlanEntitlementTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task NewOwnerStartsOnPermanentFreeEntitlements()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var response = await client.GetAsync("/api/capabilities");
        response.EnsureSuccessStatusCode();
        var usage = await response.Content.ReadFromJsonAsync<UsagePayload>();

        Assert.NotNull(usage);
        Assert.Equal("Free", usage.Plan);
        Assert.Equal("Active", usage.Status);
        Assert.Equal(3, usage.BarberLimit);
        Assert.Equal(5, usage.ServiceLimit);
        Assert.Equal(1, usage.LocationLimit);
        Assert.Equal(100, usage.MonthlyTurnLimit);
        Assert.Equal(110, usage.MonthlyTurnGraceLimit);
        Assert.Equal(7, usage.HistoryRetentionDays);
        Assert.False(usage.CanUseAppointments);
        Assert.False(usage.CanUseTv);
        Assert.False(usage.CanUseAdvancedReports);
        Assert.False(usage.CanUseAdvancedAutomation);
    }

    [Fact]
    public async Task FreeBarberLimitAllowsThreeActiveBarbersAndRejectsFourth()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        for (var index = 1; index <= 3; index++)
        {
            var created = await client.PostAsJsonAsync("/api/queue/barbers", new { name = $"Barber {index}", chairNumber = index });
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }

        var rejected = await client.PostAsJsonAsync("/api/queue/barbers", new { name = "Barber 4", chairNumber = 4 });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
    }

    [Fact]
    public async Task FreeServiceLimitIsEnforcedServerSide()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        for (var index = 1; index <= 5; index++)
        {
            var created = await client.PostAsJsonAsync("/api/queue/services", new { name = $"Service {index}", price = 10m, estimatedDurationMinutes = 30, description = (string?)null });
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }

        var rejected = await client.PostAsJsonAsync("/api/queue/services", new { name = "Service 6", price = 10m, estimatedDurationMinutes = 30, description = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
    }

    [Fact]
    public async Task FreeTurnGraceThresholdBlocksOnlyNewTurns()
    {
        using var client = CreateClient();
        var auth = await RegisterOwnerAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        var serviceResponse = await client.PostAsJsonAsync("/api/queue/services", new { name = "Cut", price = 20m, estimatedDurationMinutes = 30, description = (string?)null });
        serviceResponse.EnsureSuccessStatusCode();
        var service = await serviceResponse.Content.ReadFromJsonAsync<ServicePayload>();
        Assert.NotNull(service);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var shop = await db.BarberShops.SingleAsync(x => x.Slug == auth.Slug);
            var tz = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId);
            var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz);
            var today = new DateOnly(localNow.Year, localNow.Month, localNow.Day);
            for (var index = 1; index <= 110; index++)
                db.Turns.Add(new Turn(shop.Id, service.Id, today, index, $"Customer {index}"));
            await db.SaveChangesAsync();
        }

        var rejected = await client.PostAsJsonAsync("/api/queue/turns", new { serviceId = service.Id, customerName = "Blocked customer", barberId = (Guid?)null, customerPhone = (string?)null });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

        var queue = await client.GetAsync("/api/queue/turns");
        queue.EnsureSuccessStatusCode();
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task<AuthPayload> RegisterOwnerAsync(HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N")[..10];
        var slug = $"free-plan-{suffix}";
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Free Plan {suffix}",
            barberShopSlug = slug,
            name = $"Owner {suffix}",
            email = $"free-plan-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        return auth with { Slug = slug };
    }

    private sealed record AuthPayload(string AccessToken, string? Slug = null);
    private sealed record ServicePayload(Guid Id);
    private sealed record UsagePayload(
        string Plan,
        string Status,
        int BarberLimit,
        int ServiceLimit,
        int LocationLimit,
        int MonthlyTurnLimit,
        int MonthlyTurnGraceLimit,
        int HistoryRetentionDays,
        bool CanUseAppointments,
        bool CanUseTv,
        bool CanUseAdvancedReports,
        bool CanUseAdvancedAutomation);
}
