namespace BarberTurn.Application.Auth;

public sealed record RegisterOwnerRequest(string BarberShopName, string BarberShopSlug, string Name, string Email, string Password);
public sealed record LoginRequest(string Email, string Password);
public sealed record AuthResponse(string AccessToken, DateTimeOffset ExpiresAtUtc, Guid UserId, Guid BarberShopId, string Name, string Role);

public interface IAuthService
{
    Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}
