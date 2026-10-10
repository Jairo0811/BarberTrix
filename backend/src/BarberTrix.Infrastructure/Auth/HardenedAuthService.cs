using System.Collections.Concurrent;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using BarberTrix.Application.Auth;
using BarberTrix.Application.Common;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Common;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberTrix.Infrastructure.Auth;

internal interface ILoginAttemptGuard
{
    bool IsBlocked(string normalizedEmail);
    void RecordFailure(string normalizedEmail);
    void Reset(string normalizedEmail);
}

internal sealed class LoginAttemptGuard : ILoginAttemptGuard
{
    private sealed record Entry(int Failures, DateTimeOffset WindowStartedAtUtc);

    private readonly ConcurrentDictionary<string, Entry> attempts = new(StringComparer.OrdinalIgnoreCase);
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    private const int MaximumFailures = 8;

    public bool IsBlocked(string normalizedEmail)
    {
        if (!attempts.TryGetValue(normalizedEmail, out var entry))
            return false;

        if (DateTimeOffset.UtcNow - entry.WindowStartedAtUtc >= Window)
        {
            attempts.TryRemove(normalizedEmail, out _);
            return false;
        }

        return entry.Failures >= MaximumFailures;
    }

    public void RecordFailure(string normalizedEmail)
    {
        var now = DateTimeOffset.UtcNow;
        attempts.AddOrUpdate(
            normalizedEmail,
            _ => new Entry(1, now),
            (_, current) => now - current.WindowStartedAtUtc >= Window
                ? new Entry(1, now)
                : current with { Failures = current.Failures + 1 });
    }

    public void Reset(string normalizedEmail) => attempts.TryRemove(normalizedEmail, out _);
}

internal sealed class HardenedAuthService(
    AuthService inner,
    ApplicationDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration,
    ILoginAttemptGuard loginAttempts,
    ITransactionalEmailDispatcher emailDispatcher) : IAuthService
{
    private const int MaximumPasswordLength = 128;
    private static readonly User DummyUser = User.CreateClient("Timing Guard", "timing-guard@example.invalid", string.Empty);
    private static readonly string DummyPasswordHash = new PasswordHasher<User>()
        .HashPassword(DummyUser, "Timing-guard-only-password-2026!Aa1");
    private TimeSpan RefreshReuseGracePeriod => TimeSpan.FromSeconds(
        Math.Clamp(configuration.GetValue("Auth:RefreshReuseGraceSeconds", 10), 0, 60));

    public async Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateRegistrationCredentials(request.Email, request.Password);
        try
        {
            return await inner.RegisterOwnerAsync(request, userAgent, ipAddress, cancellationToken);
        }
        catch (InvalidOperationException ex) when (IsRegistrationCollision(ex))
        {
            throw new BusinessRuleException("REGISTRATION_CONFLICT", "Unable to create an account with the supplied registration details.");
        }
    }

    public async Task<AuthResponse> RegisterBarberAsync(RegisterBarberRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateRegistrationCredentials(request.Email, request.Password);
        try
        {
            return await inner.RegisterBarberAsync(request, userAgent, ipAddress, cancellationToken);
        }
        catch (InvalidOperationException ex) when (IsRegistrationCollision(ex))
        {
            throw new BusinessRuleException("REGISTRATION_CONFLICT", "Unable to create an account with the supplied registration details.");
        }
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || request.Password.Length > MaximumPasswordLength)
            return null;

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (loginAttempts.IsBlocked(normalizedEmail))
        {
            BurnPasswordHashTime(request.Password);
            return null;
        }

        var user = await dbContext.Users.SingleOrDefaultAsync(
            x => x.Email == normalizedEmail && x.IsActive,
            cancellationToken);

        if (user is null)
        {
            BurnPasswordHashTime(request.Password);
            loginAttempts.RecordFailure(normalizedEmail);
            return null;
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            loginAttempts.RecordFailure(normalizedEmail);
            return null;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.UpgradePasswordHash(passwordHasher.HashPassword(user, request.Password));
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        loginAttempts.Reset(normalizedEmail);
        return await inner.LoginAsync(request, userAgent, ipAddress, cancellationToken);
    }

    public Task<AuthResponse> CreateDemoSessionAsync(string? userAgent, string? ipAddress, CancellationToken cancellationToken = default) =>
        inner.CreateDemoSessionAsync(userAgent, ipAddress, cancellationToken);

    public async Task<AuthResponse?> RefreshAsync(RefreshTokenRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return null;

        var tokenHash = SecureToken.Hash(request.RefreshToken);
        var now = DateTimeOffset.UtcNow;
        var current = await dbContext.RefreshSessions.AsNoTracking()
            .SingleOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (current is null)
            return null;

        if (current.RevokedAtUtc is { } revokedAt)
        {
            if (!string.IsNullOrWhiteSpace(current.ReplacedByTokenHash) && revokedAt <= now - RefreshReuseGracePeriod)
                await RevokeAllActiveSessionsAsync(current.UserId, cancellationToken);
            return null;
        }

        if (current.ExpiresAtUtc <= now)
            return null;

        var user = await dbContext.Users.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == current.UserId && x.IsActive, cancellationToken);
        if (user is null)
            return null;

        var nextRawToken = SecureToken.Create();
        var nextHash = SecureToken.Hash(nextRawToken);
        var refreshExpires = now.AddDays(configuration.GetValue("Jwt:RefreshTokenDays", 30));

        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        var affected = await dbContext.RefreshSessions
            .Where(x => x.Id == current.Id && x.RevokedAtUtc == null && x.ExpiresAtUtc > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.RevokedAtUtc, now)
                .SetProperty(x => x.ReplacedByTokenHash, nextHash), cancellationToken);

        if (affected != 1)
            return null;

        dbContext.RefreshSessions.Add(new RefreshSession(user.Id, nextHash, refreshExpires, userAgent, ipAddress));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreateAuthResponse(user, nextRawToken, refreshExpires);
    }

    public Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default) =>
        inner.LogoutAsync(request, cancellationToken);

    public Task<string?> CreatePasswordResetTokenAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default) =>
        inner.CreatePasswordResetTokenAsync(request, cancellationToken);

    public Task<bool> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.NewPassword) || request.NewPassword.Length > MaximumPasswordLength)
            return Task.FromResult(false);
        return inner.ResetPasswordAsync(request, cancellationToken);
    }

    public Task<string?> CreateEmailVerificationTokenAsync(Guid userId, CancellationToken cancellationToken = default) =>
        inner.CreateEmailVerificationTokenAsync(userId, cancellationToken);

    public Task<bool> SendEmailVerificationAsync(Guid userId, CancellationToken cancellationToken = default) =>
        inner.SendEmailVerificationAsync(userId, cancellationToken);

    public Task<bool> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default) =>
        inner.VerifyEmailAsync(request, cancellationToken);

    public Task<IReadOnlyList<TeamMemberResponse>> GetTeamAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        inner.GetTeamAsync(barberShopId, cancellationToken);

    public async Task<InvitationResponse> CreateInvitationAsync(Guid barberShopId, CreateInvitationRequest request, string frontendBaseUrl, bool exposeDevelopmentUrl, CancellationToken cancellationToken = default)
    {
        ValidateEmail(request.Email);
        var invitation = await inner.CreateInvitationAsync(barberShopId, request, frontendBaseUrl, exposeDevelopmentUrl, cancellationToken);
        await emailDispatcher.FlushAsync(cancellationToken);
        return invitation;
    }

    public async Task<AuthResponse> AcceptInvitationAsync(AcceptInvitationRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.Password) || request.Password.Length > MaximumPasswordLength)
            throw new ArgumentException($"Password must not exceed {MaximumPasswordLength} characters.", nameof(request));

        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var response = await inner.AcceptInvitationAsync(request, userAgent, ipAddress, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    public Task<bool> DeactivateTeamMemberAsync(Guid barberShopId, Guid userId, CancellationToken cancellationToken = default) =>
        inner.DeactivateTeamMemberAsync(barberShopId, userId, cancellationToken);

    private void BurnPasswordHashTime(string password) =>
        _ = passwordHasher.VerifyHashedPassword(DummyUser, DummyPasswordHash, password);

    private async Task RevokeAllActiveSessionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var revokedAt = DateTimeOffset.UtcNow;
        await dbContext.RefreshSessions
            .Where(x => x.UserId == userId && x.RevokedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.RevokedAtUtc, revokedAt), cancellationToken);
    }

    private static void ValidateRegistrationCredentials(string email, string password)
    {
        ValidateEmail(email);
        if (string.IsNullOrEmpty(password) || password.Length > MaximumPasswordLength)
            throw new ArgumentException($"Password must be between 1 and {MaximumPasswordLength} characters.", nameof(password));
    }

    private static void ValidateEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 180 ||
            !MailAddress.TryCreate(email.Trim(), out var address) ||
            !string.Equals(address.Address, email.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("A valid email is required.", nameof(email));
    }

    private static bool IsRegistrationCollision(InvalidOperationException exception) =>
        exception.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase) ||
        exception.Message.Contains("already in use", StringComparison.OrdinalIgnoreCase);

    private AuthResponse CreateAuthResponse(User user, string refreshToken, DateTimeOffset refreshExpiresAtUtc)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(configuration.GetValue("Jwt:AccessTokenMinutes", 15));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new("security_stamp", user.SecurityStamp),
            new("email_verified", user.IsEmailVerified ? "true" : "false")
        };

        var sessionScope = user.BarberShopId.HasValue ? "Tenant" : "Onboarding";
        if (user.BarberShopId is Guid barberShopId)
        {
            claims.Add(new Claim("barbershop_id", barberShopId.ToString()));
            claims.Add(new Claim(ClaimTypes.Role, user.Role.ToString()));
            if (user.BarberId is Guid barberId)
                claims.Add(new Claim("barber_id", barberId.ToString()));
        }

        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be configured at runtime with at least 32 characters.");

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"] ?? "BarberTrix.Api",
            configuration["Jwt:Audience"] ?? "BarberTrix.Web",
            claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt,
            refreshToken,
            refreshExpiresAtUtc,
            user.Id,
            user.BarberShopId,
            user.BarberId,
            user.Name,
            user.Role.ToString(),
            user.IsEmailVerified,
            sessionScope);
    }
}
