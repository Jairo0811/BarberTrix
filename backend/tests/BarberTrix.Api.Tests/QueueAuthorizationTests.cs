using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTrix.Application.Auth;
using BarberTrix.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class QueueAuthorizationTests
{
    private readonly BarberTrixFactory factory;

    public QueueAuthorizationTests(BarberTrixFactory factory) => this.factory = factory;

    [Fact]
    public async Task BarberCannotMarkAnotherBarbersTurnAsNoShow()
    {
        using var ownerClient = CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var registration = await ownerClient.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Queue Auth {suffix}",
            barberShopSlug = $"queue-auth-{suffix}",
            name = $"Owner {suffix}",
            email = $"queue-owner-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        registration.EnsureSuccessStatusCode();
        var owner = await registration.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(owner);
        ownerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", owner.AccessToken);

        var firstBarberResponse = await ownerClient.PostAsJsonAsync("/api/queue/barbers", new { name = $"Barber A {suffix}", chairNumber = 1 });
        firstBarberResponse.EnsureSuccessStatusCode();
        var firstBarber = await firstBarberResponse.Content.ReadFromJsonAsync<BarberPayload>();
        Assert.NotNull(firstBarber);

        var secondBarberResponse = await ownerClient.PostAsJsonAsync("/api/queue/barbers", new { name = $"Barber B {suffix}", chairNumber = 2 });
        secondBarberResponse.EnsureSuccessStatusCode();
        var secondBarber = await secondBarberResponse.Content.ReadFromJsonAsync<BarberPayload>();
        Assert.NotNull(secondBarber);

        var serviceResponse = await ownerClient.PostAsJsonAsync("/api/queue/services", new
        {
            name = $"Corte {suffix}",
            price = 500m,
            estimatedDurationMinutes = 30,
            description = "Queue authorization test"
        });
        serviceResponse.EnsureSuccessStatusCode();
        var service = await serviceResponse.Content.ReadFromJsonAsync<ServicePayload>();
        Assert.NotNull(service);

        var turnResponse = await ownerClient.PostAsJsonAsync("/api/queue/turns", new
        {
            serviceId = service.Id,
            customerName = "Cliente protegido",
            barberId = secondBarber.Id,
            customerPhone = "809-555-0401"
        });
        turnResponse.EnsureSuccessStatusCode();
        var turn = await turnResponse.Content.ReadFromJsonAsync<TurnPayload>();
        Assert.NotNull(turn);

        var called = await ownerClient.PostAsync($"/api/queue/turns/{turn.Id}/call/{secondBarber.Id}", null);
        called.EnsureSuccessStatusCode();

        await using var scope = factory.Services.CreateAsyncScope();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        var invitation = await authService.CreateInvitationAsync(
            owner.BarberShopId,
            new CreateInvitationRequest($"Barber User {suffix}", $"barber-user-{suffix}@example.com", UserRole.Barber, firstBarber.Id),
            "https://example.test",
            true);
        Assert.NotNull(invitation.DevelopmentAcceptanceUrl);
        var invitationToken = ExtractToken(invitation.DevelopmentAcceptanceUrl);

        using var barberClient = CreateClient();
        var accepted = await barberClient.PostAsJsonAsync("/api/auth/accept-invitation", new
        {
            token = invitationToken,
            password = "BarberTest123!",
            acceptedTerms = true
        });
        accepted.EnsureSuccessStatusCode();
        var barberSession = await accepted.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(barberSession);
        barberClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", barberSession.AccessToken);

        var forbiddenNoShow = await barberClient.PostAsync($"/api/queue/turns/{turn.Id}/no-show", null);
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenNoShow.StatusCode);

        var queue = await ownerClient.GetFromJsonAsync<List<TurnPayload>>("/api/queue/turns");
        Assert.NotNull(queue);
        var protectedTurn = Assert.Single(queue, item => item.Id == turn.Id);
        Assert.Equal("Called", protectedTurn.Status);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static string ExtractToken(string url)
    {
        const string marker = "token=";
        var index = url.IndexOf(marker, StringComparison.Ordinal);
        Assert.True(index >= 0);
        return Uri.UnescapeDataString(url[(index + marker.Length)..]);
    }

    private sealed record AuthPayload(string AccessToken, Guid BarberShopId);
    private sealed record BarberPayload(Guid Id);
    private sealed record ServicePayload(Guid Id);
    private sealed record TurnPayload(Guid Id, string Status);
}
