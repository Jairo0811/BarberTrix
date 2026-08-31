using BarberTurn.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BarberTurn.Infrastructure.Persistence;

public sealed class DevelopmentDataSeeder(
    ApplicationDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var enabled = configuration.GetValue<bool>("SystemAdmin:Enabled")
            || configuration.GetValue<bool>("DemoAdmin:Enabled");
        if (!enabled)
            return;

        var email = configuration["SystemAdmin:Email"] ?? configuration["DemoAdmin:Email"];
        var password = configuration["SystemAdmin:Password"] ?? configuration["DemoAdmin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("System administrator credentials must be configured when administrator seeding is enabled.");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existingUser = await dbContext.Users
            .SingleOrDefaultAsync(user => user.Email == normalizedEmail, cancellationToken);

        if (existingUser is not null)
        {
            var verification = passwordHasher.VerifyHashedPassword(existingUser, existingUser.PasswordHash, password);
            if (verification != PasswordVerificationResult.Success)
                existingUser.ChangePasswordHash(passwordHasher.HashPassword(existingUser, password));

            if (existingUser.Role != UserRole.Administrator)
                existingUser.ChangeRole(UserRole.Administrator, null);

            if (!existingUser.IsEmailVerified)
                existingUser.MarkEmailVerified();

            var existingShop = await dbContext.BarberShops.SingleAsync(x => x.Id == existingUser.BarberShopId, cancellationToken);
            existingShop.ChangeSubscription(SubscriptionPlan.Business, SubscriptionStatus.Active);

            if (!await dbContext.ShopMemberships.AnyAsync(
                    x => x.UserId == existingUser.Id && x.BarberShopId == existingUser.BarberShopId,
                    cancellationToken))
            {
                dbContext.ShopMemberships.Add(new ShopMembership(
                    existingUser.Id,
                    existingUser.BarberShopId,
                    UserRole.Administrator));
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var barberShop = await dbContext.BarberShops
            .SingleOrDefaultAsync(shop => shop.Slug == "barberturn-admin", cancellationToken);

        if (barberShop is null)
        {
            barberShop = new BarberShop("BarberTurn Administración", "barberturn-admin");
            barberShop.ChangeSubscription(SubscriptionPlan.Business, SubscriptionStatus.Active);
            dbContext.BarberShops.Add(barberShop);
            dbContext.ShopLocations.Add(new ShopLocation(
                barberShop.Id,
                "Administración",
                "principal",
                null,
                barberShop.TimeZoneId));
        }
        else
        {
            barberShop.ChangeSubscription(SubscriptionPlan.Business, SubscriptionStatus.Active);
        }

        var userShell = new User(
            barberShop.Id,
            "Administrador BarberTurn",
            normalizedEmail,
            string.Empty,
            UserRole.Administrator);

        var passwordHash = passwordHasher.HashPassword(userShell, password);
        var seededUser = new User(
            barberShop.Id,
            "Administrador BarberTurn",
            normalizedEmail,
            passwordHash,
            UserRole.Administrator);

        seededUser.MarkEmailVerified();
        dbContext.Users.Add(seededUser);
        dbContext.ShopMemberships.Add(new ShopMembership(seededUser.Id, barberShop.Id, UserRole.Administrator));
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
