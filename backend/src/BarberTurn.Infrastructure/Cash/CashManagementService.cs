using System.Data;
using System.Text.Json;
using BarberTurn.Application.Cash;
using BarberTurn.Application.Commercial;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Cash;

internal sealed class CashManagementService(ApplicationDbContext dbContext) : ICashManagementService
{
    private const string ResourceType = "CashSession";
    private const string OpenAction = "CashSessionOpened";
    private const string MovementAction = "CashMovementAdded";
    private const string CloseAction = "CashSessionClosed";
    private const string RefundAction = "PaymentRefunded";

    public async Task<CashSessionResponse?> GetCurrentAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var opened = await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.ResourceType == ResourceType && x.Action == OpenAction)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (opened is null || await IsClosedAsync(barberShopId, opened.ResourceId!, cancellationToken))
            return null;

        return await BuildSessionAsync(barberShopId, opened, cancellationToken);
    }

    public async Task<IReadOnlyList<CashSessionResponse>> GetRecentAsync(Guid barberShopId, int take, CancellationToken cancellationToken = default)
    {
        var openedSessions = await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.ResourceType == ResourceType && x.Action == OpenAction)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(Math.Clamp(take, 1, 30))
            .ToListAsync(cancellationToken);

        var result = new List<CashSessionResponse>(openedSessions.Count);
        foreach (var opened in openedSessions)
            result.Add(await BuildSessionAsync(barberShopId, opened, cancellationToken));
        return result;
    }

    public async Task<CashSessionResponse> OpenAsync(Guid barberShopId, Guid? userId, OpenCashSessionRequest request, CancellationToken cancellationToken = default)
    {
        var currency = NormalizeCurrency(request.Currency);
        if (request.OpeningBalance < 0)
            throw new ArgumentOutOfRangeException(nameof(request), "Opening balance cannot be negative.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        if (await GetCurrentAsync(barberShopId, cancellationToken) is not null)
            throw new InvalidOperationException("A cash session is already open.");

        var sessionId = Guid.NewGuid();
        var log = new AuditLog(
            barberShopId,
            userId,
            OpenAction,
            ResourceType,
            sessionId.ToString(),
            JsonSerializer.Serialize(new OpenMetadata(currency, request.OpeningBalance)),
            null);
        dbContext.AuditLogs.Add(log);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildSessionAsync(barberShopId, log, cancellationToken);
    }

    public async Task<CashSessionResponse> AddMovementAsync(Guid barberShopId, Guid? userId, AddCashMovementRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(request), "Movement amount must be greater than zero.");
        var reason = RequireTrimmed(request.Reason, 200, "Movement reason is required.");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var session = await GetCurrentOpenLogAsync(barberShopId, cancellationToken)
            ?? throw new InvalidOperationException("Open a cash session before registering movements.");

        dbContext.AuditLogs.Add(CreateMovementLog(barberShopId, userId, session.ResourceId!, request.Type, request.Amount, reason));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildSessionAsync(barberShopId, session, cancellationToken);
    }

    public async Task<CashSessionResponse> CloseAsync(Guid barberShopId, Guid? userId, CloseCashSessionRequest request, CancellationToken cancellationToken = default)
    {
        if (request.CountedCash < 0)
            throw new ArgumentOutOfRangeException(nameof(request), "Counted cash cannot be negative.");
        var note = TrimOptional(request.Note, 500);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var opened = await GetCurrentOpenLogAsync(barberShopId, cancellationToken)
            ?? throw new InvalidOperationException("There is no open cash session.");
        var current = await BuildSessionAsync(barberShopId, opened, cancellationToken);
        var difference = request.CountedCash - current.ExpectedCash;

        dbContext.AuditLogs.Add(new AuditLog(
            barberShopId,
            userId,
            CloseAction,
            ResourceType,
            opened.ResourceId,
            JsonSerializer.Serialize(new CloseMetadata(request.CountedCash, current.ExpectedCash, difference, note)),
            null));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await BuildSessionAsync(barberShopId, opened, cancellationToken);
    }

    public async Task<PaymentResponse> RefundPaymentAsync(Guid barberShopId, Guid? userId, Guid paymentId, string? reason, CancellationToken cancellationToken = default)
    {
        var normalizedReason = TrimOptional(reason, 300);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var payment = await dbContext.Payments.SingleOrDefaultAsync(x => x.Id == paymentId && x.BarberShopId == barberShopId, cancellationToken)
            ?? throw new KeyNotFoundException("Payment was not found.");
        if (payment.Status != PaymentStatus.Paid)
            throw new InvalidOperationException("Only paid records can be refunded.");

        if (payment.Method == PaymentMethod.Cash)
        {
            var session = await GetCurrentOpenLogAsync(barberShopId, cancellationToken)
                ?? throw new InvalidOperationException("Open a cash session before refunding a cash payment.");
            var current = await BuildSessionAsync(barberShopId, session, cancellationToken);
            if (!string.Equals(current.Currency, payment.Currency, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Open a {payment.Currency} cash session before refunding this cash payment.");

            dbContext.AuditLogs.Add(CreateMovementLog(
                barberShopId,
                userId,
                session.ResourceId!,
                CashMovementType.CashOut,
                payment.Amount,
                $"Refund {payment.Id}: {normalizedReason ?? "Customer refund"}"));
        }

        payment.Refund();
        dbContext.AuditLogs.Add(new AuditLog(
            barberShopId,
            userId,
            RefundAction,
            "Payment",
            payment.Id.ToString(),
            JsonSerializer.Serialize(new RefundMetadata(payment.Amount, payment.Currency, payment.Method, normalizedReason)),
            null));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ToPaymentResponse(payment);
    }

    private async Task<AuditLog?> GetCurrentOpenLogAsync(Guid barberShopId, CancellationToken cancellationToken)
    {
        var opened = await dbContext.AuditLogs
            .Where(x => x.BarberShopId == barberShopId && x.ResourceType == ResourceType && x.Action == OpenAction)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (opened is null || await IsClosedAsync(barberShopId, opened.ResourceId!, cancellationToken))
            return null;
        return opened;
    }

    private Task<bool> IsClosedAsync(Guid barberShopId, string resourceId, CancellationToken cancellationToken) =>
        dbContext.AuditLogs.AsNoTracking().AnyAsync(
            x => x.BarberShopId == barberShopId && x.ResourceType == ResourceType && x.ResourceId == resourceId && x.Action == CloseAction,
            cancellationToken);

    private async Task<CashSessionResponse> BuildSessionAsync(Guid barberShopId, AuditLog opened, CancellationToken cancellationToken)
    {
        var openMetadata = Deserialize<OpenMetadata>(opened.Metadata) ?? throw new InvalidOperationException("Cash session metadata is invalid.");
        var events = await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.ResourceType == ResourceType && x.ResourceId == opened.ResourceId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
        var closed = events.LastOrDefault(x => x.Action == CloseAction);
        var end = closed?.CreatedAtUtc ?? DateTimeOffset.UtcNow.AddSeconds(1);

        var payments = await dbContext.Payments.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId
                && x.Currency == openMetadata.Currency
                && x.PaidAtUtc >= opened.CreatedAtUtc
                && x.PaidAtUtc < end
                && (x.Status == PaymentStatus.Paid || x.Status == PaymentStatus.Refunded))
            .ToListAsync(cancellationToken);

        var movements = events
            .Where(x => x.Action == MovementAction)
            .Select(x => (Log: x, Metadata: Deserialize<MovementMetadata>(x.Metadata)))
            .Where(x => x.Metadata is not null)
            .Select(x => new CashMovementResponse(x.Log.Id, x.Metadata!.Type, x.Metadata.Amount, x.Metadata.Reason, x.Log.CreatedAtUtc))
            .ToList();

        var cashSales = payments.Where(x => x.Method == PaymentMethod.Cash).Sum(x => x.Amount);
        var nonCashSales = payments.Where(x => x.Method != PaymentMethod.Cash && x.Status == PaymentStatus.Paid).Sum(x => x.Amount);
        var cashIn = movements.Where(x => x.Type == CashMovementType.CashIn).Sum(x => x.Amount);
        var cashOut = movements.Where(x => x.Type == CashMovementType.CashOut).Sum(x => x.Amount);
        var expected = openMetadata.OpeningBalance + cashSales + cashIn - cashOut;
        var closeMetadata = Deserialize<CloseMetadata>(closed?.Metadata);

        return new CashSessionResponse(
            Guid.Parse(opened.ResourceId!),
            openMetadata.Currency,
            openMetadata.OpeningBalance,
            opened.CreatedAtUtc,
            closed?.CreatedAtUtc,
            cashSales,
            nonCashSales,
            cashIn,
            cashOut,
            expected,
            closeMetadata?.CountedCash,
            closeMetadata?.Difference,
            closeMetadata?.Note,
            movements);
    }

    private static AuditLog CreateMovementLog(Guid barberShopId, Guid? userId, string sessionId, CashMovementType type, decimal amount, string reason) =>
        new(
            barberShopId,
            userId,
            MovementAction,
            ResourceType,
            sessionId,
            JsonSerializer.Serialize(new MovementMetadata(type, amount, reason)),
            null);

    private static string NormalizeCurrency(string currency)
    {
        var normalized = string.IsNullOrWhiteSpace(currency) ? "DOP" : currency.Trim().ToUpperInvariant();
        if (normalized.Length != 3 || normalized.Any(x => !char.IsLetter(x)))
            throw new ArgumentException("Currency must use a three-letter ISO code.", nameof(currency));
        return normalized;
    }

    private static string RequireTrimmed(string value, int maxLength, string error)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException(error);
        var trimmed = value.Trim();
        return trimmed[..Math.Min(trimmed.Length, maxLength)];
    }

    private static string? TrimOptional(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        return trimmed[..Math.Min(trimmed.Length, maxLength)];
    }

    private static T? Deserialize<T>(string? json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<T>(json); }
        catch (JsonException) { return null; }
    }

    private static PaymentResponse ToPaymentResponse(PaymentRecord payment) =>
        new(payment.Id, payment.Amount, payment.Currency, payment.Method, payment.Status, payment.TurnId, payment.AppointmentId, payment.CustomerId, payment.ExternalReference, payment.PaidAtUtc);

    private sealed record OpenMetadata(string Currency, decimal OpeningBalance);
    private sealed record MovementMetadata(CashMovementType Type, decimal Amount, string Reason);
    private sealed record CloseMetadata(decimal CountedCash, decimal ExpectedCash, decimal Difference, string? Note);
    private sealed record RefundMetadata(decimal Amount, string Currency, PaymentMethod Method, string? Reason);
}
