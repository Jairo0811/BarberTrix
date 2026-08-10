using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BarberTurn.Application.Auth;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberTurn.Infrastructure.Auth;

internal sealed class AuthService(
    ApplicationDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration) : IAuthService
{
    public async Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedSlug = request.BarberShopSlug.Trim().ToLowerInvariant();

        if (await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken))
            throw new InvalidOperationException("A user with that email already exists.");

        if (await dbContext.BarberShops.AnyAsync(x => x.Slug == normalizedSlug, cancellationToken))
            throw new InvalidOperationException("That barbershop slug is already in use.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var barberShop = new BarberShop(request.BarberShopName, normalizedSlug);
        dbContext.BarberShops.Add(barberShop);

        var user = new User(barberShop.Id, request.Name, normalizedEmail, string.Empty, UserRole.Owner);
        var passwordHash = passwordHasher.HashPassword(user, request.Password);

        user = new User(barberShop.Id, request.Name, normalizedEmail, passwordHash, UserRole.Owner);
        dbContext.Users.Add(user);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreateToken(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == normalizedEmail && x.IsActive, cancellationToken);

        if (user is null)
            return null;

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        return verification == PasswordVerificationResult.Failed ? null : CreateToken(user);
    }

    private AuthResponse CreateToken(User user)
    {
        var key = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = configuration["Jwt:Issuer"] ?? "BarberTurn.Api";
        var audience = configuration["Jwt:Audience"] ?? "BarberTurn.Web";
        var expiresAt = DateTimeOffset.UtcNow.AddHours(8);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("barbershop_id", user.BarberShopId.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(issuer, audience, claims, expires: expiresAt.UtcDateTime, signingCredentials: credentials);
        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponse(accessToken, expiresAt, user.Id, user.BarberShopId, user.Name, user.Role.ToString());
    }
}
