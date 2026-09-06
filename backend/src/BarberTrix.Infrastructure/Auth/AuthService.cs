using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BarberTrix.Application.Auth;
using BarberTrix.Application.Common;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberTrix.Infrastructure.Auth;

internal sealed class AuthService(
    ApplicationDbContext dbContext,
    IPasswordHasher<User> passwordHasher,
    IConfiguration configuration,
    IHumanVerificationService humanVerification,
    IEmailSender emailSender,
    IPlanLimitService planLimits) : IAuthService
{
    private const string PasswordResetAudience = "BarberTrix.PasswordReset";
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
        dbContext.ShopMemberships.Add(new ShopMembership(user.Id, barberShop.Id, UserRole.Owner));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        if (!user.IsEmailVerified)
            await SendVerificationEmailAsync(user, cancellationToken);

        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    public async Task<AuthResponse> RegisterBarberAsync(RegisterBarberRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateBarberRegistration(request);
        if (!await humanVerification.VerifyAsync(request.CaptchaToken, ipAddress, cancellationToken))
            throw new InvalidOperationException("Human verification failed.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken))
            throw new InvalidOperationException("A user with that email already exists.");

        var shell = User.CreateIndependentBarber(request.Name, normalizedEmail, string.Empty);
        var user = User.CreateIndependentBarber(
            request.Name,
            normalizedEmail,
            passwordHasher.HashPassword(shell, request.Password));
        if (!configuration.GetValue("Auth:RequireVerifiedEmail", false))
            user.MarkEmailVerified();

        dbContext.Users.Add(user);
        dbContext.BarberProfiles.Add(new BarberProfile(user.Id, user.Name));
        await dbContext.SaveChangesAsync(cancellationToken);

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
        var shop = new BarberShop("BarberTrix Demo", $"demo-{suffix}", "America/Santo_Domingo");
        dbContext.BarberShops.Add(shop);
        dbContext.ShopLocations.Add(new ShopLocation(shop.Id, "Sucursal principal", "principal", "Av. Demo 123", shop.TimeZoneId));

        var user = CreateUser(shop.Id, "Administrador Demo", $"demo-{suffix}@example.invalid", SecureToken.Create() + "Aa1!", UserRole.Owner, null);
        user.MarkEmailVerified();
        dbContext.Users.Add(user);
        dbContext.ShopMemberships.Add(new ShopMembership(user.Id, shop.Id, UserRole.Owner));

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
        var issuer = configuration["Jwt:Issuer"] ?? "BarberTrix.Api";
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
            await emailSender.SendAsync(user.Email, "Restablece tu contraseña de BarberTrix", $"<p>Usa este enlace durante los próximos 30 minutos:</p><p><a href=\"{url}\">Restablecer contraseña</a></p>", cancellationToken);
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
        if (request.Role is not (UserRole.Barber or UserRole.Administrator or UserRole.Receptionist) ||
            string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120 ||
            !System.Net.Mail.MailAddress.TryCreate(request.Email, out var address) || address.Address != request.Email.Trim() || request.Email.Length > 180)
            throw new ArgumentException("A valid name, email and staff role are required.");
        if (request.Role == UserRole.Barber && request.BarberId is null && request.ChairNumber is null)
            throw new ArgumentException("A barber or chair is required.");
        if (request.BarberId.HasValue && request.ChairNumber.HasValue)
            throw new ArgumentException("Choose an existing barber or a new chair, not both.");
        await using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var email = request.Email.Trim().ToLowerInvariant();
        var existingUser = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email && x.IsActive, cancellationToken);
        if (existingUser is not null && (request.Role != UserRole.Barber || existingUser.Role != UserRole.Barber || existingUser.BarberShopId.HasValue ||
            !await dbContext.BarberProfiles.AnyAsync(x => x.UserId == existingUser.Id, cancellationToken)))
            throw new BusinessRuleException("TEAM_MEMBER_EXISTS", "This email already belongs to a member.");
        var now = DateTimeOffset.UtcNow;
        if (await dbContext.TeamInvitations.AnyAsync(x => x.BarberShopId == barberShopId && x.Email == email && x.AcceptedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > now, cancellationToken))
            throw new BusinessRuleException("TEAM_INVITATION_EXISTS", "An active invitation already exists.");
        Guid? linkedBarberId = request.Role == UserRole.Barber ? request.BarberId : null;
        if (request.Role == UserRole.Barber && request.ChairNumber is int chair)
        {
            if (chair <= 0) throw new ArgumentException("A positive chair number is required.");
            if (await dbContext.Barbers.AnyAsync(x => x.BarberShopId == barberShopId && x.ChairNumber == chair, cancellationToken))
                throw new BusinessRuleException("TEAM_CHAIR_CONFLICT", "This chair is already assigned.");
            try { await planLimits.EnsureCanAddBarberAsync(barberShopId, cancellationToken); }
            catch (InvalidOperationException) { throw new BusinessRuleException("PLAN_RESOURCE_LIMIT", "The plan has no capacity for another barber."); }
            var barber = new Barber(barberShopId, request.Name, chair);
            dbContext.Barbers.Add(barber);
            linkedBarberId = barber.Id;
        }
        else if (linkedBarberId is Guid barberId)
        {
            if (!await dbContext.Barbers.AnyAsync(x => x.Id == barberId && x.BarberShopId == barberShopId && x.IsActive, cancellationToken))
                throw new ArgumentException("The selected barber is not available in this barbershop.");
            if (await dbContext.Users.AnyAsync(x => x.BarberId == barberId && x.IsActive, cancellationToken) ||
                await dbContext.TeamInvitations.AnyAsync(x => x.BarberId == barberId && x.AcceptedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > now, cancellationToken))
                throw new BusinessRuleException("TEAM_BARBER_LINKED", "The barber is already linked.");
        }
        var raw = SecureToken.Create();
        var invitation = new TeamInvitation(barberShopId, email, request.Name, request.Role, linkedBarberId, SecureToken.Hash(raw), DateTimeOffset.UtcNow.AddDays(3));
        dbContext.TeamInvitations.Add(invitation);
        await dbContext.SaveChangesAsync(cancellationToken);
        var url = $"{frontendBaseUrl.TrimEnd('/')}/#/accept-invitation?token={Uri.EscapeDataString(raw)}";
        await emailSender.SendAsync(email, "Invitación a BarberTrix", $"<p>Has sido invitado a BarberTrix.</p><p><a href=\"{url}\">Aceptar invitación</a></p>", cancellationToken);
        await transaction.CommitAsync(cancellationToken);
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
        var existingUser = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == invitation.Email && x.IsActive, cancellationToken);
        if (existingUser is not null)
        {
            if (invitation.Role != UserRole.Barber || invitation.BarberId is null || existingUser.Role != UserRole.Barber || existingUser.BarberShopId.HasValue ||
                !await dbContext.BarberProfiles.AnyAsync(x => x.UserId == existingUser.Id, cancellationToken))
                throw new InvalidOperationException("The invitation cannot be applied to this existing account.");
            if (passwordHasher.VerifyHashedPassword(existingUser, existingUser.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                throw new InvalidOperationException("The current account password is invalid.");

            var membership = await dbContext.ShopMemberships.SingleOrDefaultAsync(
                x => x.UserId == existingUser.Id && x.BarberShopId == invitation.BarberShopId, cancellationToken);
            if (membership is null)
                dbContext.ShopMemberships.Add(new ShopMembership(existingUser.Id, invitation.BarberShopId, UserRole.Barber, invitation.BarberId));
            else
                membership.ReactivateAsBarber(invitation.BarberId.Value);

            existingUser.AssignTenant(invitation.BarberShopId, UserRole.Barber, invitation.BarberId);
            var pendingRequests = await dbContext.BarberJoinRequests
                .Where(x => x.UserId == existingUser.Id && x.Status == BarberJoinRequestStatus.Pending)
                .ToListAsync(cancellationToken);
            pendingRequests.ForEach(x => x.Withdraw());
            invitation.Accept();
            await dbContext.SaveChangesAsync(cancellationToken);
            return await CreateSessionAsync(existingUser, userAgent, ipAddress, cancellationToken);
        }

        var user = CreateUser(invitation.BarberShopId, invitation.Name, invitation.Email, request.Password, invitation.Role, invitation.BarberId);
        user.MarkEmailVerified();
        invitation.Accept();
        dbContext.Users.Add(user);
        dbContext.ShopMemberships.Add(new ShopMembership(user.Id, invitation.BarberShopId, invitation.Role, invitation.BarberId));
        if (invitation.Role == UserRole.Barber)
            dbContext.BarberProfiles.Add(new BarberProfile(user.Id, user.Name));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

    public async Task<bool> DeactivateTeamMemberAsync(Guid barberShopId, Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.BarberShopId == barberShopId, cancellationToken);
        if (user is null || user.Role == UserRole.Owner)
            return false;
        user.Deactivate();
        var membership = await dbContext.ShopMemberships.SingleOrDefaultAsync(
            x => x.UserId == user.Id && x.BarberShopId == barberShopId,
            cancellationToken);
        membership?.Revoke();
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
        var shopIds = await dbContext.BarberShops
            .Where(x => x.Slug.StartsWith("demo-") && x.CreatedAtUtc < cutoff)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (shopIds.Count == 0)
            return;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var userIds = dbContext.Users
            .Where(x => x.BarberShopId.HasValue && shopIds.Contains(x.BarberShopId.Value))
            .Select(x => x.Id);

        await dbContext.AuditLogs.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.EmailVerificationTokens.Where(x => userIds.Contains(x.UserId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.RefreshSessions.Where(x => userIds.Contains(x.UserId)).ExecuteDeleteAsync(cancellationToken);

        await dbContext.BarberJoinRequests
            .Where(x =>
                shopIds.Contains(x.BarberShopId) ||
                userIds.Contains(x.UserId) ||
                (x.ReviewedByUserId.HasValue && userIds.Contains(x.ReviewedByUserId.Value)))
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.TeamInvitations.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.PushSubscriptions.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Payments.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.TurnRequests.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Turns.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Appointments.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BlockedTimes.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Customers.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.ShopLocations.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.ShopMemberships.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);

        await dbContext.Users
            .Where(x => x.BarberShopId.HasValue && shopIds.Contains(x.BarberShopId.Value))
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.Subscriptions.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BarberServices.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.Barbers.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);
        await dbContext.BarberShops.Where(x => shopIds.Contains(x.Id)).ExecuteDeleteAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
    }
    private AuthResponse CreateAuthResponse(User user, string refreshToken, DateTimeOffset refreshExpiresAtUtc)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(configuration.GetValue("Jwt:AccessTokenMinutes", 15));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name), new("security_stamp", user.SecurityStamp),
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
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey())), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(configuration["Jwt:Issuer"] ?? "BarberTrix.Api", configuration["Jwt:Audience"] ?? "BarberTrix.Web", claims, expires: expiresAt.UtcDateTime, signingCredentials: credentials);
        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, refreshToken, refreshExpiresAtUtc, user.Id, user.BarberShopId, user.BarberId, user.Name, user.Role.ToString(), user.IsEmailVerified, sessionScope);
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
        await emailSender.SendAsync(user.Email, "Verifica tu correo de BarberTrix", $"<p><a href=\"{url}\">Verificar correo</a></p>", cancellationToken);
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
                ValidIssuer = configuration["Jwt:Issuer"] ?? "BarberTrix.Api", ValidAudience = PasswordResetAudience,
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

    private static void ValidateBarberRegistration(RegisterBarberRequest request)
    {
        if (!request.AcceptedTerms) throw new ArgumentException("Terms must be accepted.");
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 120) throw new ArgumentException("A valid name is required.");
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@') || request.Email.Length > 180) throw new ArgumentException("A valid email is required.");
        if (!IsStrongPassword(request.Password)) throw new ArgumentException("Password must contain at least 10 characters, uppercase, lowercase, number and symbol.");
    }

    private static bool IsStrongPassword(string? password) => !string.IsNullOrWhiteSpace(password) && password.Length >= 10 &&
        password.Any(char.IsUpper) && password.Any(char.IsLower) && password.Any(char.IsDigit) && password.Any(ch => !char.IsLetterOrDigit(ch));
    private string GetJwtKey() => configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
    private static string CreatePasswordFingerprint(string passwordHash) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)));
}
