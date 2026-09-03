using BarberTrix.Application.Commercial;

namespace BarberTrix.Application.Cash;

public enum CashMovementType
{
    CashIn = 1,
    CashOut = 2
}

public sealed record OpenCashSessionRequest(string Currency, decimal OpeningBalance);
public sealed record AddCashMovementRequest(CashMovementType Type, decimal Amount, string Reason);
public sealed record CloseCashSessionRequest(decimal CountedCash, string? Note);
public sealed record RefundPaymentRequest(string? Reason);

public sealed record CashMovementResponse(
    Guid Id,
    CashMovementType Type,
    decimal Amount,
    string Reason,
    DateTimeOffset CreatedAtUtc);

public sealed record CashSessionResponse(
    Guid Id,
    string Currency,
    decimal OpeningBalance,
    DateTimeOffset OpenedAtUtc,
    DateTimeOffset? ClosedAtUtc,
    decimal CashSales,
    decimal NonCashSales,
    decimal CashIn,
    decimal CashOut,
    decimal ExpectedCash,
    decimal? CountedCash,
    decimal? Difference,
    string? ClosingNote,
    IReadOnlyList<CashMovementResponse> Movements);

public interface ICashManagementService
{
    Task<CashSessionResponse?> GetCurrentAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CashSessionResponse>> GetRecentAsync(Guid barberShopId, int take, CancellationToken cancellationToken = default);
    Task<CashSessionResponse> OpenAsync(Guid barberShopId, Guid? userId, OpenCashSessionRequest request, CancellationToken cancellationToken = default);
    Task<CashSessionResponse> AddMovementAsync(Guid barberShopId, Guid? userId, AddCashMovementRequest request, CancellationToken cancellationToken = default);
    Task<CashSessionResponse> CloseAsync(Guid barberShopId, Guid? userId, CloseCashSessionRequest request, CancellationToken cancellationToken = default);
    Task<PaymentResponse> RefundPaymentAsync(Guid barberShopId, Guid? userId, Guid paymentId, string? reason, CancellationToken cancellationToken = default);
}
