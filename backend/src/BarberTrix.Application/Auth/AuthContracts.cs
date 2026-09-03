using BarberTrix.Domain.Entities;

namespace BarberTrix.Application.Auth;

public sealed record RegisterOwnerRequest(
    string BarberShopName,
    string BarberShopSlug,
    string Name,
    string Email,
    string Password,
    string TimeZoneId = "America/Santo_Domingo",
    bool AcceptedTerms = false,
    string? CaptchaToken = null);
public sealed record RegisterBarberRequest(
    string Name,
    string Email,
    string Password,
    bool AcceptedTerms = false,
    string? CaptchaToken = null);
public sealed record LoginRequest(string Email, string Password);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ForgotPasswordResponse(string Message, string? DevelopmentResetUrl = null);
public sealed record ResetPasswordRequest(string Token, string NewPassword);
public sealed record RefreshTokenRequest(string RefreshToken);
public sealed record LogoutRequest(string RefreshToken);
public sealed record VerifyEmailRequest(string Token);
public sealed record CreateInvitationRequest(string Name, string Email, UserRole Role, Guid? BarberId);
public sealed record AcceptInvitationRequest(string Token, string Password, bool AcceptedTerms);
public sealed record TeamMemberResponse(Guid Id, string Name, string Email, UserRole Role, Guid? BarberId, bool IsActive, bool IsEmailVerified);
public sealed record InvitationResponse(Guid Id, string Email, UserRole Role, DateTimeOffset ExpiresAtUtc, string? DevelopmentAcceptanceUrl);
public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAtUtc,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAtUtc,
    Guid UserId,
    Guid? BarberShopId,
    Guid? BarberId,
    string Name,
    string Role,
    bool IsEmailVerified,
    string SessionScope);

public interface IAuthService
{
    Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponse> RegisterBarberAsync(RegisterBarberRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponse?> LoginAsync(LoginRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponse> CreateDemoSessionAsync(string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AuthResponse?> RefreshAsync(RefreshTokenRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);
    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default);
    Task<string?> CreatePasswordResetTokenAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
    Task<string?> CreateEmailVerificationTokenAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> SendEmailVerificationAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeamMemberResponse>> GetTeamAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<InvitationResponse> CreateInvitationAsync(Guid barberShopId, CreateInvitationRequest request, string frontendBaseUrl, bool exposeDevelopmentUrl, CancellationToken cancellationToken = default);
    Task<AuthResponse> AcceptInvitationAsync(AcceptInvitationRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeactivateTeamMemberAsync(Guid barberShopId, Guid userId, CancellationToken cancellationToken = default);
}
