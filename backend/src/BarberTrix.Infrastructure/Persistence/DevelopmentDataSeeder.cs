using BarberTrix.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BarberTrix.Infrastructure.Persistence;

public sealed class DevelopmentDataSeeder(
    ApplicationDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration)
{
    private const string LegacyAdminEmail = "admin@barbertrix.com.do";
    private const string CanonicalAdminEmail = "admin@barbertrix.com.do";
    private const string BarberEmail = "barbero@barbertrix.com.do";
    private const string OwnerBarberEmail = "dueno.barbero@barbertrix.com.do";
    private const string ClientEmail = "cliente@barbertrix.com.do";

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var enabled = configuration.GetValue<bool>("SystemAdmin:Enabled")
            || configuration.GetValue<bool>("DemoAdmin:Enabled");
        if (!enabled)
            return;

        var configuredEmail = configuration["SystemAdmin:Email"] ?? configuration["DemoAdmin:Email"];
        var password = configuration["SystemAdmin:Password"] ?? configuration["DemoAdmin:Password"];
        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("System administrator password must be configured when administrator seeding is enabled.");

        var adminEmail = NormalizeAdminEmail(configuredEmail);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var adminShop = await EnsureAdminShopAsync(cancellationToken);
        await EnsureAdministratorAsync(adminShop, adminEmail, password, cancellationToken);
        await EnsureBarberAccountAsync(adminShop, password, cancellationToken);
        await EnsureOwnerBarberAccountAsync(password, cancellationToken);
        await EnsureClientAccountAsync(password, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task<BarberShop> EnsureAdminShopAsync(CancellationToken cancellationToken)
    {
        var shop = await dbContext.BarberShops.SingleOrDefaultAsync(x => x.Slug == "barbertrix-admin", cancellationToken);
        if (shop is null)
        {
            shop = new BarberShop("BarberTrix Administración", "barbertrix-admin");
            dbContext.BarberShops.Add(shop);
        }
        else
        {
            shop.UpdateSettings("BarberTrix Administración", shop.TimeZoneId);
        }

        shop.ChangeSubscription(SubscriptionPlan.Business, SubscriptionStatus.Active);
        if (!await dbContext.ShopLocations.AnyAsync(x => x.BarberShopId == shop.Id, cancellationToken))
            dbContext.ShopLocations.Add(new ShopLocation(shop.Id, "Administración", "principal", "Santo Domingo, República Dominicana", shop.TimeZoneId));
        if (!await dbContext.BarberServices.AnyAsync(x => x.BarberShopId == shop.Id, cancellationToken))
            dbContext.BarberServices.Add(new BarberService(shop.Id, "Corte clásico", 650, 35, "Servicio de prueba para escenarios BarberTrix."));
        return shop;
    }

    private async Task EnsureAdministratorAsync(BarberShop shop, string email, string password, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null && email == CanonicalAdminEmail)
        {
            user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == LegacyAdminEmail, cancellationToken);
            user?.ChangeEmail(CanonicalAdminEmail);
        }

        if (user is null)
        {
            user = CreateTenantUser(shop.Id, "Administrador BarberTrix", email, password, UserRole.Administrator);
            dbContext.Users.Add(user);
        }
        else
        {
            EnsurePassword(user, password);
            if (user.Role != UserRole.Administrator)
                user.ChangeRole(UserRole.Administrator, null);
            if (!user.IsEmailVerified)
                user.MarkEmailVerified();
        }

        if (!await dbContext.ShopMemberships.AnyAsync(x => x.UserId == user.Id && x.BarberShopId == shop.Id, cancellationToken))
            dbContext.ShopMemberships.Add(new ShopMembership(user.Id, shop.Id, UserRole.Administrator));
    }

    private async Task EnsureBarberAccountAsync(BarberShop shop, string password, CancellationToken cancellationToken)
    {
        var operational = await dbContext.Barbers.SingleOrDefaultAsync(x => x.BarberShopId == shop.Id && x.Name == "Barbero de Prueba", cancellationToken);
        if (operational is null)
        {
            var nextChair = (await dbContext.Barbers.Where(x => x.BarberShopId == shop.Id).Select(x => (int?)x.ChairNumber).MaxAsync(cancellationToken) ?? 0) + 1;
            operational = new Barber(shop.Id, "Barbero de Prueba", nextChair);
            dbContext.Barbers.Add(operational);
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == BarberEmail, cancellationToken);
        if (user is null)
        {
            user = CreateTenantUser(shop.Id, "Barbero de Prueba", BarberEmail, password, UserRole.Barber, operational.Id);
            dbContext.Users.Add(user);
            dbContext.BarberProfiles.Add(new BarberProfile(user.Id, user.Name));
        }
        else
        {
            EnsurePassword(user, password);
            if (!user.IsEmailVerified) user.MarkEmailVerified();
        }

        if (!await dbContext.ShopMemberships.AnyAsync(x => x.UserId == user.Id && x.BarberShopId == shop.Id, cancellationToken))
            dbContext.ShopMemberships.Add(new ShopMembership(user.Id, shop.Id, UserRole.Barber, operational.Id));
    }

    private async Task EnsureOwnerBarberAccountAsync(string password, CancellationToken cancellationToken)
    {
        var shop = await dbContext.BarberShops.SingleOrDefaultAsync(x => x.Slug == "barbertrix-owner-demo", cancellationToken);
        if (shop is null)
        {
            shop = new BarberShop("BarberTrix Owner Lab", "barbertrix-owner-demo");
            shop.ChangeSubscription(SubscriptionPlan.Pro, SubscriptionStatus.Active);
            dbContext.BarberShops.Add(shop);
            dbContext.ShopLocations.Add(new ShopLocation(shop.Id, "Sucursal principal", "principal", "Santo Domingo, República Dominicana", shop.TimeZoneId));
            dbContext.BarberServices.Add(new BarberService(shop.Id, "Corte + barba", 950, 55, "Servicio demo del dueño barbero."));
        }

        var operational = await dbContext.Barbers.SingleOrDefaultAsync(x => x.BarberShopId == shop.Id && x.Name == "Dueño Barbero", cancellationToken);
        if (operational is null)
        {
            operational = new Barber(shop.Id, "Dueño Barbero", 1);
            dbContext.Barbers.Add(operational);
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == OwnerBarberEmail, cancellationToken);
        if (user is null)
        {
            user = CreateTenantUser(shop.Id, "Dueño Barbero", OwnerBarberEmail, password, UserRole.Owner, operational.Id);
            dbContext.Users.Add(user);
            var profile = new BarberProfile(user.Id, user.Name);
            profile.Update(user.Name, "Propietario que también atiende clientes.", true);
            dbContext.BarberProfiles.Add(profile);
        }
        else
        {
            EnsurePassword(user, password);
            if (!user.IsEmailVerified) user.MarkEmailVerified();
        }

        if (!await dbContext.ShopMemberships.AnyAsync(x => x.UserId == user.Id && x.BarberShopId == shop.Id, cancellationToken))
            dbContext.ShopMemberships.Add(new ShopMembership(user.Id, shop.Id, UserRole.Owner));
    }

    private async Task EnsureClientAccountAsync(string password, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == ClientEmail, cancellationToken);
        if (user is null)
        {
            var shell = User.CreateClient("Cliente de Prueba", ClientEmail, string.Empty);
            user = User.CreateClient("Cliente de Prueba", ClientEmail, passwordHasher.HashPassword(shell, password));
            user.MarkEmailVerified();
            dbContext.Users.Add(user);
            return;
        }

        EnsurePassword(user, password);
        if (!user.IsEmailVerified) user.MarkEmailVerified();
    }

    private User CreateTenantUser(Guid shopId, string name, string email, string password, UserRole role, Guid? barberId = null)
    {
        var shell = new User(shopId, name, email, string.Empty, role, barberId);
        var user = new User(shopId, name, email, passwordHasher.HashPassword(shell, password), role, barberId);
        user.MarkEmailVerified();
        return user;
    }

    private void EnsurePassword(User user, string password)
    {
        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
            user.ChangePasswordHash(passwordHasher.HashPassword(user, password));
    }

    private static string NormalizeAdminEmail(string? configuredEmail)
    {
        if (string.IsNullOrWhiteSpace(configuredEmail))
            return CanonicalAdminEmail;
        var normalized = configuredEmail.Trim().ToLowerInvariant();
        return normalized == LegacyAdminEmail ? CanonicalAdminEmail : normalized;
    }
}
