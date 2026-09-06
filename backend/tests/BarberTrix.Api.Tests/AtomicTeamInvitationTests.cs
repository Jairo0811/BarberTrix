using System.Net.Http.Json;
using BarberTrix.Application.Auth;
using BarberTrix.Application.Common;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class AtomicTeamInvitationTests(BarberTrixFactory factory)
{
    [Fact]
    public async Task InvitationCreatesOneBarberAndDuplicatesDoNotAllocateAnotherChair()
    {
        var shopId = await CreateShop();
        var email = $"atomic-{Guid.NewGuid():N}@example.test";
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
            await auth.CreateInvitationAsync(shopId, new("Barber A", email, UserRole.Barber, null, 1), "https://example.test", true);
        }
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
            var conflict = await Assert.ThrowsAsync<BusinessRuleException>(() => auth.CreateInvitationAsync(shopId, new("Barber B", $"other-{email}", UserRole.Barber, null, 1), "https://example.test", true));
            Assert.Equal("TEAM_CHAIR_CONFLICT", conflict.Code);
        }
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
            var duplicate = await Assert.ThrowsAsync<BusinessRuleException>(() => auth.CreateInvitationAsync(shopId, new("Barber A", email, UserRole.Barber, null, 2), "https://example.test", true));
            Assert.Equal("TEAM_INVITATION_EXISTS", duplicate.Code);
        }
        await using var check = factory.Services.CreateAsyncScope();
        var db = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var barber = Assert.Single(await db.Barbers.Where(x => x.BarberShopId == shopId).ToListAsync());
        var invitation = Assert.Single(await db.TeamInvitations.Where(x => x.BarberShopId == shopId).ToListAsync());
        Assert.Equal(barber.Id, invitation.BarberId);
    }

    [Fact]
    public async Task FailedEmailRollsBackInvitationAndOperationalBarber()
    {
        var shopId = await CreateShop();
        using var failing = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IEmailSender>(); services.AddSingleton<IEmailSender, FailingEmail>();
        }));
        await using (var scope = failing.Services.CreateAsyncScope())
        {
            var auth = scope.ServiceProvider.GetRequiredService<IAuthService>();
            await Assert.ThrowsAsync<IOException>(() => auth.CreateInvitationAsync(shopId, new("Rollback", $"rollback-{Guid.NewGuid():N}@example.test", UserRole.Barber, null, 1), "https://example.test", true));
        }
        await using var check = factory.Services.CreateAsyncScope();
        var db = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db.Barbers.AnyAsync(x => x.BarberShopId == shopId));
        Assert.False(await db.TeamInvitations.AnyAsync(x => x.BarberShopId == shopId));
    }

    private async Task<Guid> CreateShop()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var suffix = Guid.NewGuid().ToString("N");
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new { barberShopName = "Atomic team", barberShopSlug = $"atomic-{suffix}", name = "Owner", email = $"owner-{suffix}@example.test", password = "TestOnly123!", acceptedTerms = true });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Session>())!.BarberShopId;
    }
    private sealed record Session(Guid BarberShopId);
    private sealed class FailingEmail : IEmailSender
    {
        public Task SendAsync(string recipient, string subject, string htmlBody, CancellationToken cancellationToken = default) => throw new IOException("Simulated provider failure");
    }
}
