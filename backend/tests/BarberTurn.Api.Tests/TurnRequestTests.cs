using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTurn.Application.Auth;
using BarberTurn.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class TurnRequestTests
{
    private readonly BarberTurnFactory factory;

    public TurnRequestTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task AnonymousCustomerCanRequestBarberAndStaffAcceptanceCreatesAppointment()
    {
        using var client = CreateClient();
        var session = await CreateDemoSessionAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var settings = await client.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);

        client.DefaultRequestHeaders.Authorization = null;
        var shop = await client.GetFromJsonAsync<PublicShopPayload>($"/api/public/shops/{settings.Slug}");
        Assert.NotNull(shop);
        var service = Assert.Single(shop.Services.Take(1));
        var barber = Assert.Single(shop.Barbers.Take(1));
        var slot = await FirstAvailableSlotAsync(client, settings.Slug, service.Id, barber.Id);

        var created = await client.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/turn-requests", new
        {
            serviceId = service.Id,
            barberId = barber.Id,
            requestedStartsAt = slot.StartsAtUtc,
            customerName = "Cliente móvil",
            customerPhone = "809-555-0199",
            customerEmail = "mobile-customer@example.com",
            notes = "Prefiero tijera."
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var publicRequest = await created.Content.ReadFromJsonAsync<PublicTurnRequestPayload>();
        Assert.NotNull(publicRequest);
        Assert.False(string.IsNullOrWhiteSpace(publicRequest.LookupToken));
        Assert.Equal("Pending", publicRequest.Request.Status);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var inbox = await client.GetFromJsonAsync<List<TurnRequestPayload>>("/api/turn-requests");
        Assert.Contains(inbox!, x => x.Id == publicRequest.Request.Id && x.BarberId == barber.Id);

        var accepted = await client.PostAsync($"/api/turn-requests/{publicRequest.Request.Id}/accept", null);
        accepted.EnsureSuccessStatusCode();
        var acceptedRequest = await accepted.Content.ReadFromJsonAsync<TurnRequestPayload>();
        Assert.NotNull(acceptedRequest);
        Assert.Equal("Accepted", acceptedRequest.Status);
        Assert.NotNull(acceptedRequest.AppointmentId);

        client.DefaultRequestHeaders.Authorization = null;
        var status = await client.GetAsync($"/api/public/shops/{settings.Slug}/turn-requests/{publicRequest.Request.Id}?token={Uri.EscapeDataString(publicRequest.LookupToken)}");
        status.EnsureSuccessStatusCode();
        var publicStatus = await status.Content.ReadFromJsonAsync<TurnRequestPayload>();
        Assert.Equal("Accepted", publicStatus?.Status);

        var appointment = await client.GetAsync($"/api/public/shops/{settings.Slug}/appointments/{acceptedRequest.AppointmentId}?token={Uri.EscapeDataString(publicRequest.LookupToken)}");
        appointment.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task CounterProposalRequiresCustomerCapabilityTokenBeforeCreatingAppointment()
    {
        using var client = CreateClient();
        var session = await CreateDemoSessionAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var settings = await client.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);

        client.DefaultRequestHeaders.Authorization = null;
        var shop = await client.GetFromJsonAsync<PublicShopPayload>($"/api/public/shops/{settings.Slug}");
        Assert.NotNull(shop);
        var service = shop.Services[0];
        var barber = shop.Barbers[0];
        var slots = await AvailableSlotsAsync(client, settings.Slug, service.Id, barber.Id);
        Assert.True(slots.Count >= 2);

        var created = await client.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/turn-requests", new
        {
            serviceId = service.Id,
            barberId = barber.Id,
            requestedStartsAt = slots[0].StartsAtUtc,
            customerName = "Cliente contraoferta"
        });
        created.EnsureSuccessStatusCode();
        var publicRequest = await created.Content.ReadFromJsonAsync<PublicTurnRequestPayload>();
        Assert.NotNull(publicRequest);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.AccessToken);
        var counter = await client.PostAsJsonAsync($"/api/turn-requests/{publicRequest.Request.Id}/counter", new { startsAt = slots[1].StartsAtUtc });
        counter.EnsureSuccessStatusCode();
        var countered = await counter.Content.ReadFromJsonAsync<TurnRequestPayload>();
        Assert.Equal("CounterProposed", countered?.Status);
        Assert.Null(countered?.AppointmentId);

        client.DefaultRequestHeaders.Authorization = null;
        var invalidToken = await client.PostAsync($"/api/public/shops/{settings.Slug}/turn-requests/{publicRequest.Request.Id}/accept-counter?token=invalid", null);
        Assert.Equal(HttpStatusCode.NotFound, invalidToken.StatusCode);

        var accepted = await client.PostAsync($"/api/public/shops/{settings.Slug}/turn-requests/{publicRequest.Request.Id}/accept-counter?token={Uri.EscapeDataString(publicRequest.LookupToken)}", null);
        accepted.EnsureSuccessStatusCode();
        var result = await accepted.Content.ReadFromJsonAsync<TurnRequestPayload>();
        Assert.Equal("Accepted", result?.Status);
        Assert.NotNull(result?.AppointmentId);
    }

    [Fact]
    public async Task BarberCannotSeeOrOperateRequestsAssignedToAnotherBarber()
    {
        using var ownerClient = CreateClient();
        var owner = await CreateDemoSessionAsync(ownerClient);
        ownerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", owner.AccessToken);
        var settings = await ownerClient.GetFromJsonAsync<ShopPayload>("/api/shop/settings");
        Assert.NotNull(settings);

        ownerClient.DefaultRequestHeaders.Authorization = null;
        var shop = await ownerClient.GetFromJsonAsync<PublicShopPayload>($"/api/public/shops/{settings.Slug}");
        Assert.NotNull(shop);
        Assert.True(shop.Barbers.Count >= 2);
        var ownBarber = shop.Barbers[0];
        var otherBarber = shop.Barbers[1];
        var service = shop.Services[0];
        var slot = await FirstAvailableSlotAsync(ownerClient, settings.Slug, service.Id, otherBarber.Id);

        var created = await ownerClient.PostAsJsonAsync($"/api/public/shops/{settings.Slug}/turn-requests", new
        {
            serviceId = service.Id,
            barberId = otherBarber.Id,
            requestedStartsAt = slot.StartsAtUtc,
            customerName = "Cliente protegido"
        });
        created.EnsureSuccessStatusCode();
        var publicRequest = await created.Content.ReadFromJsonAsync<PublicTurnRequestPayload>();
        Assert.NotNull(publicRequest);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        await using var scope = factory.Services.CreateAsyncScope();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var invitation = await authService.CreateInvitationAsync(
            owner.BarberShopId,
            new CreateInvitationRequest($"Barber M2 {suffix}", $"barber-m2-{suffix}@example.com", UserRole.Barber, ownBarber.Id),
            "https://example.test",
            true);
        Assert.NotNull(invitation.DevelopmentAcceptanceUrl);

        using var barberClient = CreateClient();
        var accepted = await barberClient.PostAsJsonAsync("/api/auth/accept-invitation", new
        {
            token = ExtractToken(invitation.DevelopmentAcceptanceUrl),
            password = "BarberTest123!",
            acceptedTerms = true
        });
        accepted.EnsureSuccessStatusCode();
        var barberSession = await accepted.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(barberSession);
        barberClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", barberSession.AccessToken);

        var inbox = await barberClient.GetFromJsonAsync<List<TurnRequestPayload>>("/api/turn-requests");
        Assert.DoesNotContain(inbox!, request => request.Id == publicRequest.Request.Id);

        var forbidden = await barberClient.PostAsync($"/api/turn-requests/{publicRequest.Request.Id}/accept", null);
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task<AuthPayload> CreateDemoSessionAsync(HttpClient client)
    {
        var demo = await client.PostAsync("/api/auth/demo-login", null);
        demo.EnsureSuccessStatusCode();
        return await demo.Content.ReadFromJsonAsync<AuthPayload>() ?? throw new InvalidOperationException("Demo session was not returned.");
    }

    private static async Task<AvailabilitySlotPayload> FirstAvailableSlotAsync(HttpClient client, string slug, Guid serviceId, Guid barberId) =>
        (await AvailableSlotsAsync(client, slug, serviceId, barberId))[0];

    private static async Task<List<AvailabilitySlotPayload>> AvailableSlotsAsync(HttpClient client, string slug, Guid serviceId, Guid barberId)
    {
        for (var offset = 2; offset <= 6; offset++)
        {
            var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(offset));
            var slots = await client.GetFromJsonAsync<List<AvailabilitySlotPayload>>($"/api/public/shops/{slug}/appointments/availability?serviceId={serviceId}&date={date:yyyy-MM-dd}&barberId={barberId}");
            if (slots is { Count: >= 2 }) return slots;
        }
        throw new InvalidOperationException("No test availability was found.");
    }

    private static string ExtractToken(string url)
    {
        const string marker = "token=";
        var index = url.IndexOf(marker, StringComparison.Ordinal);
        Assert.True(index >= 0);
        return Uri.UnescapeDataString(url[(index + marker.Length)..]);
    }

    private sealed record AuthPayload(string AccessToken, Guid BarberShopId);
    private sealed record ShopPayload(string Slug);
    private sealed record PublicShopPayload(List<ServicePayload> Services, List<BarberPayload> Barbers);
    private sealed record ServicePayload(Guid Id);
    private sealed record BarberPayload(Guid Id);
    private sealed record AvailabilitySlotPayload(DateTimeOffset StartsAtUtc);
    private sealed record PublicTurnRequestPayload(TurnRequestPayload Request, string LookupToken);
    private sealed record TurnRequestPayload(Guid Id, Guid BarberId, string Status, Guid? AppointmentId);
}
