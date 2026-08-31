using System.Net.Http.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class BarberMembershipPersistenceTests
{
    private readonly BarberTurnFactory factory;

    public BarberMembershipPersistenceTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task OwnerRegistrationCreatesActiveOwnerMembership()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        var suffix = Guid.NewGuid().ToString("N")[..10];
        var email = $"membership-{suffix}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Membership QA {suffix}",
            barberShopSlug = $"membership-qa-{suffix}",
            name = $"Owner {suffix}",
            email,
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });

        response.EnsureSuccessStatusCode();

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await dbContext.Users.AsNoTracking().SingleAsync(x => x.Email == email);
        var membership = await dbContext.ShopMemberships.AsNoTracking().SingleAsync(
            x => x.UserId == user.Id && x.BarberShopId == user.BarberShopId);

        Assert.Equal(UserRole.Owner, membership.Role);
        Assert.Equal(ShopMembershipStatus.Active, membership.Status);
        Assert.Null(membership.BarberId);
    }
}
