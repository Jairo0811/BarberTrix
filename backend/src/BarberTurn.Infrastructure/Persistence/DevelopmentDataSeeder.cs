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
        if (!configuration.GetValue<bool>("DemoAdmin:Enabled"))
            return;

        var email = configuration["DemoAdmin:Email"];
        var password = configuration["DemoAdmin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("DemoAdmin credentials must be configured when demo seeding is enabled.");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(user => user.Email == normalizedEmail, cancellationToken))
            return;

        var barberShop = await dbContext.BarberShops
            .SingleOrDefaultAsync(shop => shop.Slug == "barberturn-demo", cancellationToken);

        if (barberShop is null)
        {
            barberShop = new BarberShop("BarberTurn Demo", "barberturn-demo");
            dbContext.BarberShops.Add(barberShop);
        }

        var user = new User(
            barberShop.Id,
            "Administrador Demo",
            normalizedEmail,
            string.Empty,
            UserRole.Administrator);

        var passwordHash = passwordHasher.HashPassword(user, password);
        var seededUser = new User(
            barberShop.Id,
            "Administrador Demo",
            normalizedEmail,
            passwordHash,
            UserRole.Administrator);

        seededUser.MarkEmailVerified();

        dbContext.Users.Add(seededUser);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
