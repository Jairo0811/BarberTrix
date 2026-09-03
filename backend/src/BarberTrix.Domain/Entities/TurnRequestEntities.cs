namespace BarberTrix.Domain.Entities;

public enum TurnRequestStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,
    CounterProposed = 4,
    Cancelled = 5,
    Expired = 6
}

public sealed class TurnRequest : BaseEntity
{
    private TurnRequest() { }

    public TurnRequest(
        Guid barberShopId,
        Guid serviceId,
        Guid barberId,
        DateTimeOffset requestedStartsAtUtc,
        string customerName,
        string? customerPhone,
        string? customerEmail,
        string? notes,
        string publicLookupTokenHash,
        DateTimeOffset expiresAtUtc,
        Guid? customerId = null)
    {
        if (barberShopId == Guid.Empty || serviceId == Guid.Empty || barberId == Guid.Empty)
            throw new ArgumentException("Barbershop, service and barber are required.");
        if (string.IsNullOrWhiteSpace(customerName))
            throw new ArgumentException("Customer name is required.", nameof(customerName));
        if (string.IsNullOrWhiteSpace(publicLookupTokenHash))
            throw new ArgumentException("Public lookup token hash is required.", nameof(publicLookupTokenHash));
        if (expiresAtUtc <= DateTimeOffset.UtcNow)
            throw new ArgumentException("Expiration must be in the future.", nameof(expiresAtUtc));

        BarberShopId = barberShopId;
        ServiceId = serviceId;
        BarberId = barberId;
        CustomerId = customerId;
        RequestedStartsAtUtc = requestedStartsAtUtc.ToUniversalTime();
        CustomerName = customerName.Trim();
        CustomerPhone = Normalize(customerPhone);
        CustomerEmail = Normalize(customerEmail)?.ToLowerInvariant();
        Notes = Normalize(notes);
        PublicLookupTokenHash = publicLookupTokenHash;
        ExpiresAtUtc = expiresAtUtc.ToUniversalTime();
        Status = TurnRequestStatus.Pending;
    }

    public Guid BarberShopId { get; private set; }
    public Guid ServiceId { get; private set; }
    public Guid BarberId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public Guid? AppointmentId { get; private set; }
    public DateTimeOffset RequestedStartsAtUtc { get; private set; }
    public DateTimeOffset? CounterProposedStartsAtUtc { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;
    public string? CustomerPhone { get; private set; }
    public string? CustomerEmail { get; private set; }
    public string? Notes { get; private set; }
    public string PublicLookupTokenHash { get; private set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? RespondedAtUtc { get; private set; }
    public TurnRequestStatus Status { get; private set; }
    public byte[] RowVersion { get; private set; } = [];

    public bool IsExpired(DateTimeOffset nowUtc) =>
        Status is TurnRequestStatus.Pending or TurnRequestStatus.CounterProposed && ExpiresAtUtc <= nowUtc;

    public DateTimeOffset EffectiveStartsAtUtc => CounterProposedStartsAtUtc ?? RequestedStartsAtUtc;

    public void Accept(Guid appointmentId, DateTimeOffset nowUtc)
    {
        EnsureActionable(nowUtc);
        if (appointmentId == Guid.Empty)
            throw new ArgumentException("Appointment is required.", nameof(appointmentId));
        AppointmentId = appointmentId;
        Status = TurnRequestStatus.Accepted;
        RespondedAtUtc = nowUtc;
        Touch();
    }

    public void Reject(DateTimeOffset nowUtc)
    {
        EnsureActionable(nowUtc);
        Status = TurnRequestStatus.Rejected;
        RespondedAtUtc = nowUtc;
        Touch();
    }

    public void CounterPropose(DateTimeOffset startsAtUtc, DateTimeOffset nowUtc)
    {
        EnsureActionable(nowUtc);
        CounterProposedStartsAtUtc = startsAtUtc.ToUniversalTime();
        Status = TurnRequestStatus.CounterProposed;
        RespondedAtUtc = nowUtc;
        Touch();
    }

    public void Cancel(DateTimeOffset nowUtc)
    {
        EnsureActionable(nowUtc);
        Status = TurnRequestStatus.Cancelled;
        RespondedAtUtc = nowUtc;
        Touch();
    }

    public void MarkExpired(DateTimeOffset nowUtc)
    {
        if (!IsExpired(nowUtc))
            return;
        Status = TurnRequestStatus.Expired;
        RespondedAtUtc = nowUtc;
        Touch();
    }

    private void EnsureActionable(DateTimeOffset nowUtc)
    {
        if (IsExpired(nowUtc))
            throw new InvalidOperationException("The turn request has expired.");
        if (Status is not (TurnRequestStatus.Pending or TurnRequestStatus.CounterProposed))
            throw new InvalidOperationException("The turn request is no longer actionable.");
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
