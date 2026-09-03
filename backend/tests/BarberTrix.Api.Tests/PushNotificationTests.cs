using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class PushNotificationTests(BarberTrixFactory factory)
{
    [Fact]
    public async Task StaffAndCustomerSubscriptionsAreCapabilityBoundAndQueuePrivateNotifications()
    {
        using var client = CreateClient();
        var session = await CreateDemoSessionAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var settings = await client.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);

        var staffInstallationId = Guid.NewGuid();
        var staffToken = ExpoToken('a');
        var registerStaff = await client.PutAsJsonAsync("/api/push/subscriptions", new
        {
            installationId = staffInstallationId,
            expoPushToken = staffToken,
            platform = "Android"
        });
        Assert.Equal(HttpStatusCode.NoContent, registerStaff.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var publicShop = await client.GetFromJsonAsync<PublicShopPayload>($"/api/public/shops/{settings.Slug}");
        Assert.NotNull(publicShop);
        var service = publicShop.Services[0];
        var barber = publicShop.Barbers[0];
        var slot = await FirstAvailableSlotAsync(client, settings.Slug, service.Id, barber.Id);
        var created = await client.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/turn-requests", new
        {
            serviceId = service.Id,
            barberId = barber.Id,
            requestedStartsAt = slot.StartsAtUtc,
            customerName = "Nombre privado M3"
        });
        created.EnsureSuccessStatusCode();
        var publicRequest = await created.Content.ReadFromJsonAsync<PublicTurnRequestPayload>();
        Assert.NotNull(publicRequest);

        var customerInstallationId = Guid.NewGuid();
        var invalidCapability = await client.PutAsJsonAsync(
            $"/api/public/shops/{settings.Slug}/turn-requests/{publicRequest.Request.Id}/push-subscription?token=invalid",
            new { installationId = customerInstallationId, expoPushToken = ExpoToken('b'), platform = "Ios" });
        Assert.Equal(HttpStatusCode.NotFound, invalidCapability.StatusCode);

        var registerCustomer = await client.PutAsJsonAsync(
            $"/api/public/shops/{settings.Slug}/turn-requests/{publicRequest.Request.Id}/push-subscription?token={Uri.EscapeDataString(publicRequest.LookupToken)}",
            new { installationId = customerInstallationId, expoPushToken = ExpoToken('c'), platform = "Ios" });
        Assert.Equal(HttpStatusCode.NoContent, registerCustomer.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var accepted = await client.PostAsync($"/api/turn-requests/{publicRequest.Request.Id}/accept", null);
        accepted.EnsureSuccessStatusCode();

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subscriptions = await db.PushSubscriptions.AsNoTracking()
            .Where(item => item.InstallationId == staffInstallationId || item.InstallationId == customerInstallationId)
            .ToListAsync();
        Assert.Equal(2, subscriptions.Count);

        var staffSubscription = Assert.Single(subscriptions, item => item.UserId == session.UserId);
        var customerSubscription = Assert.Single(subscriptions, item => item.TurnRequestId == publicRequest.Request.Id);
        var notifications = await db.PushNotificationOutbox.AsNoTracking()
            .Where(item => item.PushSubscriptionId == staffSubscription.Id || item.PushSubscriptionId == customerSubscription.Id)
            .ToListAsync();
        var staffNotification = Assert.Single(notifications, item => item.PushSubscriptionId == staffSubscription.Id);
        Assert.Equal("/(app)/turn-requests", staffNotification.Route);
        Assert.DoesNotContain("Nombre privado M3", staffNotification.Body, StringComparison.Ordinal);
        var customerNotification = Assert.Single(notifications, item => item.PushSubscriptionId == customerSubscription.Id);
        Assert.Equal($"/request-status/{settings.Slug}/{publicRequest.Request.Id}", customerNotification.Route);
        Assert.Equal(PushDeliveryStatus.Pending, customerNotification.Status);
    }

    [Fact]
    public async Task StaffRegistrationIsAuthenticatedAndUpsertsByInstallation()
    {
        using var client = CreateClient();
        var installationId = Guid.NewGuid();
        var anonymous = await client.PutAsJsonAsync("/api/push/subscriptions", new
        {
            installationId,
            expoPushToken = ExpoToken('d'),
            platform = "Android"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var session = await CreateDemoSessionAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        foreach (var token in new[] { ExpoToken('e'), ExpoToken('f') })
        {
            var response = await client.PutAsJsonAsync("/api/push/subscriptions", new
            {
                installationId,
                expoPushToken = token,
                platform = "Android"
            });
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var subscription = await db.PushSubscriptions.AsNoTracking().SingleAsync(
            item => item.UserId == session.UserId && item.InstallationId == installationId);
        Assert.Equal(ExpoToken('f'), subscription.ExpoPushToken);

        var removed = await client.DeleteAsync($"/api/push/subscriptions/{installationId}");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        db.ChangeTracker.Clear();
        var deactivated = await db.PushSubscriptions.FindAsync(subscription.Id);
        Assert.NotNull(deactivated);
        Assert.False(deactivated.IsActive);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task<AuthPayload> CreateDemoSessionAsync(HttpClient client)
    {
        var response = await client.PostAsync("/api/auth/demo-login", null);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AuthPayload>()
            ?? throw new InvalidOperationException("Demo session was not returned.");
    }

    private static async Task<AvailabilitySlotPayload> FirstAvailableSlotAsync(HttpClient client, string slug, Guid serviceId, Guid barberId)
    {
        for (var offset = 2; offset <= 6; offset++)
        {
            var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(offset));
            var slots = await client.GetFromJsonAsync<List<AvailabilitySlotPayload>>(
                $"/api/public/shops/{slug}/appointments/availability?serviceId={serviceId}&date={date:yyyy-MM-dd}&barberId={barberId}");
            if (slots is { Count: > 0 }) return slots[0];
        }
        throw new InvalidOperationException("No test availability was found.");
    }

    private static string ExpoToken(char value) => $"ExpoPushToken[{new string(value, 22)}]";

    private sealed record AuthPayload(string AccessToken, Guid UserId);
    private sealed record ShopPayload(string Slug);
    private sealed record PublicShopPayload(List<ServicePayload> Services, List<BarberPayload> Barbers);
    private sealed record ServicePayload(Guid Id);
    private sealed record BarberPayload(Guid Id);
    private sealed record AvailabilitySlotPayload(DateTimeOffset StartsAtUtc);
    private sealed record PublicTurnRequestPayload(TurnRequestPayload Request, string LookupToken);
    private sealed record TurnRequestPayload(Guid Id);
}
