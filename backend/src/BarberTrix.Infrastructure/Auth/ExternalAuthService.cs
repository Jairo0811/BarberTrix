using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BarberTrix.Application.Auth;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberTrix.Infrastructure.Auth;

internal sealed class ExternalAuthService(
    ApplicationDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IExternalIdentityVerifier identityVerifier,
    IConfiguration configuration) : IExternalAuthService
{
    public async Task<AuthResponse?> LoginAsync(
        ExternalLoginRequest request,
        string? userAgent,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var identity = await identityVerifier.VerifyAsync(request.Provider, request.IdentityToken, cancellationToken);
        if (identity is null || !identity.EmailVerified)
            return null;

        var normalizedEmail = identity.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.SingleOrDefaultAsync(
            x => x.Email == normalizedEmail && x.IsActive,
            cancellationToken);

        // Social sign-in is customer-only for now. Staff identities must explicitly link a provider
        // from an authenticated account before passwordless staff access is allowed.
        if (user is not null && user.Role != UserRole.Client)
            return null;

        if (user is null)
        {
            var shell = User.CreateClient(identity.Name, normalizedEmail, string.Empty);
            var generatedPassword = SecureToken.Create() + "Aa1!";
            user = User.CreateClient(
                identity.Name,
                normalizedEmail,
                passwordHasher.HashPassword(shell, generatedPassword));
            user.MarkEmailVerified();
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (!user.IsEmailVerified)
        {
            user.MarkEmailVerified();
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    private async Task<AuthResponse> CreateSessionAsync(
        User user,
        string? userAgent,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var refreshToken = SecureToken.Create();
        var refreshExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(configuration.GetValue("Jwt:RefreshTokenDays", 30));
        dbContext.RefreshSessions.Add(new RefreshSession(
            user.Id,
            SecureToken.Hash(refreshToken),
            refreshExpiresAtUtc,
            userAgent,
            ipAddress));
        await dbContext.SaveChangesAsync(cancellationToken);

        var expiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(configuration.GetValue("Jwt:AccessTokenMinutes", 15));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new("security_stamp", user.SecurityStamp),
            new("email_verified", "true")
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey())),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"] ?? "BarberTrix.Api",
            configuration["Jwt:Audience"] ?? "BarberTrix.Web",
            claims,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAtUtc,
            refreshToken,
            refreshExpiresAtUtc,
            user.Id,
            null,
            null,
            user.Name,
            UserRole.Client.ToString(),
            true,
            "Client");
    }

    private string GetJwtKey() =>
        configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
}
