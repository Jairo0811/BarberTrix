using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BarberTurn.Application.Auth;
using BarberTurn.Application.Common;
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
    IConfiguration configuration,
    IHumanVerificationService humanVerification,
    IEmailSender emailSender) : IAuthService
{
    private const string PasswordResetAudience = "BarberTurn.PasswordReset";
    private const string PasswordResetPurpose = "password-reset";

    public async Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateRegistration(request);
        if (!await humanVerification.VerifyAsync(request.CaptchaToken, ipAddress, cancellationToken))
            throw new InvalidOperationException("Human verification failed.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedSlug = request.BarberShopSlug.Trim().ToLowerInvariant();
        _ = TimeZoneInfo.FindSystemTimeZoneById(request.TimeZoneId);

        if (await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken))
            throw new InvalidOperationException("A user with that email already exists.");
        if (await dbContext.BarberShops.AnyAsync(x => x.Slug == normalizedSlug, cancellationToken))
            throw new InvalidOperationException("That barbershop slug is already in use.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var barberShop = new BarberShop(request.BarberShopName, normalizedSlug, request.TimeZoneId);
        dbContext.BarberShops.Add(barberShop);
        dbContext.ShopLocations.Add(new ShopLocation(barberShop.Id, request.BarberShopName, "principal", null, request.TimeZoneId));
        var user = CreateUser(barberShop.Id, request.Name, normalizedEmail, request.Password, UserRole.Owner, null);
        if (!configuration.GetValue("Auth:RequireVerifiedEmail", false))
            user.MarkEmailVerified();
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        if (!user.IsEmailVerified)
            await SendVerificationEmailAsync(user, cancellationToken);

        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return null;
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == normalizedEmail && x.IsActive, cancellationToken);
        if (user is null)
            return null;
        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
            return null;
        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    public async Task<AuthResponse> CreateDemoSessionAsync(string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        await PruneExpiredDemoSessionsAsync(cancellationToken);
        var suffix = Guid.NewGuid().ToString("N");
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var shop = new BarberShop("BarberTurn Demo", $"demo-{suffix}", "America/Santo_Domingo");
        dbContext.BarberShops.Add(shop);
        dbContext.ShopLocations.Add(new ShopLocation(shop.Id, "Sucursal principal", "principal", "Av. Demo 123", shop.TimeZoneId));

        var user = CreateUser(shop.Id, "Administrador Demo", $"demo-{suffix}@example.invalid", SecureToken.Create() + "Aa1!", UserRole.Owner, null);
        user.MarkEmailVerified();
        dbContext.Users.Add(user);

        var barberOne = new Barber(shop.Id, "Carlos", 1);
        var barberTwo = new Barber(shop.Id, "Miguel", 2);
        var barberThree = new Barber(shop.Id, "Ana", 3);
        var haircut = new BarberService(shop.Id, "Corte clásico", 650, 35, "Corte, terminación y peinado.");
        var beard = new BarberService(shop.Id, "Barba premium", 450, 25, "Perfilado y cuidado de barba.");
        var combo = new BarberService(shop.Id, "Corte + barba", 950, 55, "Servicio completo.");
        dbContext.AddRange(barberOne, barberTwo, barberThree, haircut, beard, combo);

        var customerOne = new Customer(shop.Id, "Luis Pérez", "809-555-0110", "luis@example.com");
        var customerTwo = new Customer(shop.Id, "Daniel Ruiz", "809-555-0111", null);
        dbContext.Customers.AddRange(customerOne, customerTwo);

        var queueDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId)).DateTime);
        dbContext.Turns.AddRange(
            new Turn(shop.Id, haircut.Id, queueDate, 1, "José", barberOne.Id),
            new Turn(shop.Id, combo.Id, queueDate, 2, "Marcos"),
            new Turn(shop.Id, beard.Id, queueDate, 3, "Pedro", barberTwo.Id));
        var tomorrow = DateTimeOffset.UtcNow.Date.AddDays(1).AddHours(15);
        dbContext.Appointments.Add(new Appointment(shop.Id, combo.Id, barberThree.Id, tomorrow, tomorrow.AddMinutes(55), customerOne.Name, customerOne.Phone, customerOne.Email, SecureToken.Hash(SecureToken.Create()), customerOne.Id));
        dbContext.Payments.Add(new PaymentRecord(shop.Id, 650, "DOP", PaymentMethod.Cash, null, null, customerTwo.Id, "DEMO-001"));

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    public async Task<AuthResponse?> RefreshAsync(RefreshTokenRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return null;
        var tokenHash = SecureToken.Hash(request.RefreshToken);
        var current = await dbContext.RefreshSessions.SingleOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);
        if (current is null || !current.IsActive)
            return null;
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == current.UserId && x.IsActive, cancellationToken);
        if (user is null)
            return null;

        var nextRawToken = SecureToken.Create();
        var nextHash = SecureToken.Hash(nextRawToken);
        current.Revoke(nextHash);
        var refreshExpires = DateTimeOffset.UtcNow.AddDays(configuration.GetValue("Jwt:RefreshTokenDays", 30));
        dbContext.RefreshSessions.Add(new RefreshSession(user.Id, nextHash, refreshExpires, userAgent, ipAddress));
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreateAuthResponse(user, nextRawToken, refreshExpires);
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return;
        var hash = SecureToken.Hash(request.RefreshToken);
        var session = await dbContext.RefreshSessions.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (session is null)
            return;
        session.Revoke();
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<string?> CreatePasswordResetTokenAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return null;
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Email == normalizedEmail && x.IsActive, cancellationToken);
        if (user is null)
            return null;

        var key = GetJwtKey();
        var issuer = configuration["Jwt:Issuer"] ?? "BarberTurn.Api";
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(30);
        var claims = new[]
        {
            new Claim("user_id", user.Id.ToString()), new Claim("email", user.Email),
            new Claim("purpose", PasswordResetPurpose), new Claim("password_fingerprint", CreatePasswordFingerprint(user.PasswordHash))
        };
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(issuer, PasswordResetAudience, claims, DateTime.UtcNow, expiresAt.UtcDateTime, credentials);
        var raw = new JwtSecurityTokenHandler().WriteToken(token);

        if (!configuration.GetValue("Email:ExposeDevelopmentLinks", false))
        {
            var frontend = configuration["PasswordReset:FrontendBaseUrl"] ?? "http://localhost:5173";
            var url = $"{frontend.TrimEnd('/')}/#/reset-password?token={Uri.EscapeDataString(raw)}";
            await emailSender.SendAsync(user.Email, "Restablece tu contraseña de BarberTurn", $"<p>Usa este enlace durante los próximos 30 minutos:</p><p><a href=\"{url}\">Restablecer contraseña</a></p>", cancellationToken);
        }
        return raw;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsStrongPassword(request.NewPassword))
            return false;
        var principal = ValidatePasswordResetToken(request.Token);
        if (principal is null || principal.FindFirst("purpose")?.Value != PasswordResetPurpose || !Guid.TryParse(principal.FindFirst("user_id")?.Value, out var userId))
            return false;
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);
        if (user is null || !string.Equals(user.Email, principal.FindFirst("email")?.Value, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(CreatePasswordFingerprint(user.PasswordHash), principal.FindFirst("password_fingerprint")?.Value, StringComparison.Ordinal))
            return false;

        user.ChangePasswordHash(passwordHasher.HashPassword(user, request.NewPassword));
        var sessions = await dbContext.RefreshSessions.Where(x => x.UserId == user.Id && x.RevokedAtUtc == null).ToListAsync(cancellationToken);
        sessions.ForEach(x => x.Revoke());
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<string?> CreateEmailVerificationTokenAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);
        if (user is null || user.IsEmailVerified)
            return null;
        var raw = SecureToken.Create();
        dbContext.EmailVerificationTokens.Add(new EmailVerificationToken(user.Id, SecureToken.Hash(raw), DateTimeOffset.UtcNow.AddHours(24)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return raw;
    }

    public async Task<bool> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return false;
        var hash = SecureToken.Hash(request.Token);
        var verification = await dbContext.EmailVerificationTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (verification is null || !verification.IsUsable)
            return false;
        var user = await dbContext.Users.SingleAsync(x => x.Id == verification.UserId, cancellationToken);
        user.MarkEmailVerified();
        verification.MarkUsed();
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> SendEmailVerificationAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken);
        if (user is null || user.IsEmailVerified)
            return false;
        await SendVerificationEmailAsync(user, cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TeamMemberResponse>> GetTeamAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.Users.AsNoTracking().Where(x => x.BarberShopId == barberShopId).OrderBy(x => x.Name)
            .Select(x => new TeamMemberResponse(x.Id, x.Name, x.Email, x.Role, x.BarberId, x.IsActive, x.IsEmailVerified)).ToListAsync(cancellationToken);

    public async Task<InvitationResponse> CreateInvitationAsync(Guid barberShopId, CreateInvitationRequest request, string frontendBaseUrl, bool exposeDevelopmentUrl, CancellationToken cancellationToken = default)
    {
        if (request.Role == UserRole.Owner || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("A valid name, email and non-owner role are required.");
        if (request.Role == UserRole.Barber && request.BarberId is null)
            throw new ArgumentException("A barber account must be linked to a barber.");
        var email = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken))
            throw new InvalidOperationException("A user with that email already exists.");
        if (request.BarberId is Guid barberId && !await dbContext.Barbers.AnyAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken))
            throw new InvalidOperationException("The selected barber does not belong to this barbershop.");
        var raw = SecureToken.Create();
        var linkedBarberId = request.Role == UserRole.Barber ? request.BarberId : null;
        var invitation = new TeamInvitation(barberShopId, email, request.Name, request.Role, linkedBarberId, SecureToken.Hash(raw), DateTimeOffset.UtcNow.AddDays(3));
        dbContext.TeamInvitations.Add(invitation);
        await dbContext.SaveChangesAsync(cancellationToken);
        var url = $"{frontendBaseUrl.TrimEnd('/')}/#/accept-invitation?token={Uri.EscapeDataString(raw)}";
        await emailSender.SendAsync(email, "Invitación a BarberTurn", $"<p>Has sido invitado a BarberTurn.</p><p><a href=\"{url}\">Aceptar invitación</a></p>", cancellationToken);
        return new InvitationResponse(invitation.Id, invitation.Email, invitation.Role, invitation.ExpiresAtUtc, exposeDevelopmentUrl ? url : null);
    }

    public async Task<AuthResponse> AcceptInvitationAsync(AcceptInvitationRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (!request.AcceptedTerms || !IsStrongPassword(request.Password) || string.IsNullOrWhiteSpace(request.Token))
            throw new ArgumentException("A strong password and acceptance of the terms are required.");
        var invitation = await dbContext.TeamInvitations.SingleOrDefaultAsync(x => x.TokenHash == SecureToken.Hash(request.Token), cancellationToken)
            ?? throw new InvalidOperationException("The invitation is invalid or expired.");
        if (!invitation.IsUsable)
            throw new InvalidOperationException("The invitation is invalid or expired.");
        var user = CreateUser(invitation.BarberShopId, invitation.Name, invitation.Email, request.Password, invitation.Role, invitation.BarberId);
        user.MarkEmailVerified();
        invitation.Accept();
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    public async Task<bool> DeactivateTeamMemberAsync(Guid barberShopId, Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.BarberShopId == barberShopId, cancellationToken);
        if (user is null || user.Role == UserRole.Owner)
            return false;
        user.Deactivate();
        var sessions = await dbContext.RefreshSessions.Where(x => x.UserId == user.Id && x.RevokedAtUtc == null).ToListAsync(cancellationToken);
        sessions.ForEach(x => x.Revoke());
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<AuthResponse> CreateSessionAsync(User user, string? userAgent, string? ipAddress, CancellationToken cancellationToken)
    {
        var raw = SecureToken.Create();
        var expires = DateTimeOffset.UtcNow.AddDays(configuration.GetValue("Jwt:RefreshTokenDays", 30));
        dbContext.RefreshSessions.Add(new RefreshSession(user.Id, SecureToken.Hash(raw), expires, userAgent, ipAddress));
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreateAuthResponse(user, raw, expires);
    }

    private async Task PruneExpiredDemoSessionsAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-4);
        var shopIds = await dbContext.BarberShops.Where(x => x.Slug.StartsWith("demo-") && x.CreatedAtUtc < cutoff).Select(x => x.Id).ToListAsync(cancellationToken);
        if (shopIds.Count == 0)
            return;

        var userIds = dbContext.Users.Where(x => shopIds.Contains(x.BarberShopId)).Select(x => x.Id);
        await dbContext.AuditLogs.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.EmailVerificationTokens.Where(x => userIds.Contains(x.UserId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.RefreshSessions.Where(x => userIds.Contains(x.UserId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.TeamInvitations.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Payments.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Turns.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Appointments.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BlockedTimes.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Customers.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.ShopLocations.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Users.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Subscriptions.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BarberServices.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Barbers.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BarberShops.Where(x => shopIds.Contains(x.Id)).ExecuteDeleteAsync(cancellationToken);
    }

    private AuthResponse CreateAuthResponse(User user, string refreshToken, DateTimeOffset refreshExpiresAtUtc)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(configuration.GetValue("Jwt:AccessTokenMinutes", 15));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new(JwtRegisteredClaimNames.Email, user.Email),
            new("barbershop_id", user.BarberShopId.ToString()), new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role.ToString()), new("security_stamp", user.SecurityStamp),
            new("email_verified", user.IsEmailVerified ? "true" : "false")
        };
        if (user.BarberId is Guid barberId)
            claims.Add(new Claim("barber_id", barberId.ToString()));
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey())), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(configuration["Jwt:Issuer"] ?? "BarberTurn.Api", configuration["Jwt:Audience"] ?? "BarberTurn.Web", claims, expires: expiresAt.UtcDateTime, signingCredentials: credentials);
        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, refreshToken, refreshExpiresAtUtc, user.Id, user.BarberShopId, user.BarberId, user.Name, user.Role.ToString(), user.IsEmailVerified);
    }

    private User CreateUser(Guid shopId, string name, string email, string password, UserRole role, Guid? barberId)
    {
        var shell = new User(shopId, name, email, string.Empty, role, barberId);
        return new User(shopId, name, email, passwordHasher.HashPassword(shell, password), role, barberId);
    }

    private async Task SendVerificationEmailAsync(User user, CancellationToken cancellationToken)
    {
        var raw = await CreateEmailVerificationTokenAsync(user.Id, cancellationToken);
        if (raw is null)
            return;
        var frontend = configuration["PasswordReset:FrontendBaseUrl"] ?? "http://localhost:5173";
        var url = $"{frontend.TrimEnd('/')}/#/verify-email?token={Uri.EscapeDataString(raw)}";
        await emailSender.SendAsync(user.Email, "Verifica tu correo de BarberTurn", $"<p><a href=\"{url}\">Verificar correo</a></p>", cancellationToken);
    }

    private ClaimsPrincipal? ValidatePasswordResetToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                ValidIssuer = configuration["Jwt:Issuer"] ?? "BarberTurn.Api", ValidAudience = PasswordResetAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey())), ClockSkew = TimeSpan.FromMinutes(1)
            }, out var validated);
            return validated is JwtSecurityToken jwt && jwt.Header.Alg == SecurityAlgorithms.HmacSha256 ? principal : null;
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException) { return null; }
    }

    private static void ValidateRegistration(RegisterOwnerRequest request)
    {
        if (!request.AcceptedTerms) throw new ArgumentException("Terms must be accepted.");
        if (string.IsNullOrWhiteSpace(request.BarberShopName) || request.BarberShopName.Length > 120) throw new ArgumentException("A valid barbershop name is required.");
        if (string.IsNullOrWhiteSpace(request.BarberShopSlug) || request.BarberShopSlug.Length > 80) throw new ArgumentException("A valid barbershop slug is required.");
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 120) throw new ArgumentException("A valid name is required.");
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@') || request.Email.Length > 180) throw new ArgumentException("A valid email is required.");
        if (!IsStrongPassword(request.Password)) throw new ArgumentException("Password must contain at least 10 characters, uppercase, lowercase, number and symbol.");
    }

    private static bool IsStrongPassword(string? password) => !string.IsNullOrWhiteSpace(password) && password.Length >= 10 &&
        password.Any(char.IsUpper) && password.Any(char.IsLower) && password.Any(char.IsDigit) && password.Any(ch => !char.IsLetterOrDigit(ch));
    private string GetJwtKey() => configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
    private static string CreatePasswordFingerprint(string passwordHash) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)));
}
