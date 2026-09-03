using System.IdentityModel.Tokens.Jwt;
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
public sealed class IndependentBarberRegistrationTests
{
    private readonly BarberTrixFactory factory;

    public IndependentBarberRegistrationTests(BarberTrixFactory factory) => this.factory = factory;

    [Fact]
    public async Task RegistrationCreatesOnboardingIdentityWithoutTenantClaims()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        var suffix = Guid.NewGuid().ToString("N")[..10];
        var email = $"barber-{suffix}@example.com";
        const string password = "ValidPass123!";
        var registration = await client.PostAsJsonAsync("/api/auth/register-barber", new
        {
            name = $"Barber {suffix}", email, password, acceptedTerms = true
        });
        registration.EnsureSuccessStatusCode();
        var payload = await registration.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(payload);
        Assert.Null(payload.BarberShopId);
        Assert.Null(payload.BarberId);
        Assert.Equal("Barber", payload.Role);
        Assert.Equal("Onboarding", payload.SessionScope);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(payload.AccessToken);
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type == "barbershop_id");
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase) || claim.Type == "role");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(x => x.Email == email);
        Assert.Null(user.BarberShopId);
        Assert.Equal(UserRole.Barber, user.Role);
        Assert.True(await db.BarberProfiles.AnyAsync(x => x.UserId == user.Id));
        Assert.False(await db.ShopMemberships.AnyAsync(x => x.UserId == user.Id));

        using var tenantRequest = new HttpRequestMessage(HttpMethod.Get, "/api/queue/barbers");
        tenantRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", payload.AccessToken);
        var tenantResponse = await client.SendAsync(tenantRequest);
        Assert.Equal(HttpStatusCode.Forbidden, tenantResponse.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        login.EnsureSuccessStatusCode();
        var loginPayload = await login.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.Equal("Onboarding", loginPayload?.SessionScope);
        Assert.Null(loginPayload?.BarberShopId);
    }

    private sealed record AuthPayload(
        string AccessToken,
        Guid? BarberShopId,
        Guid? BarberId,
        string Role,
        bool IsEmailVerified,
        string SessionScope);
}
