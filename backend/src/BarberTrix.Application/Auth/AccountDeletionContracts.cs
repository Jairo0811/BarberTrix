namespace BarberTrix.Application.Auth;

public sealed record DeleteAccountRequest(string Confirmation);

public sealed record AccountDeletionResponse(
    DateTimeOffset DeletedAtUtc,
    bool WorkspaceClosed,
    bool SubscriptionCancelled,
    string Message);

public interface IAccountDeletionService
{
    Task<AccountDeletionResponse> DeleteAsync(
        Guid userId,
        string confirmation,
        CancellationToken cancellationToken = default);
}
