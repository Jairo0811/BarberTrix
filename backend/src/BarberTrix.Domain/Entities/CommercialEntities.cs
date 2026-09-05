namespace BarberTrix.Domain.Entities;

public sealed class ShopLocation : BaseEntity
{
    private ShopLocation() { }

    public ShopLocation(Guid barberShopId, string name, string slug, string? address, string timeZoneId)
    {
        if (barberShopId == Guid.Empty) throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        BarberShopId = barberShopId;
        Update(name, slug, address, timeZoneId);
    }

    public Guid BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? Neighborhood { get; private set; }
    public string? Reference { get; private set; }
    public decimal? Latitude { get; private set; }
    public decimal? Longitude { get; private set; }
    public string TimeZoneId { get; private set; } = "America/Santo_Domingo";
    public bool IsActive { get; private set; } = true;

    public void Update(string name, string slug, string? address, string timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(timeZoneId))
            throw new ArgumentException("Name, slug and time zone are required.");
        _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        Address = Normalize(address, 300, nameof(address));
        TimeZoneId = timeZoneId.Trim();
        Touch();
    }

    public void UpdatePublicLocation(string? address, string? city, string? neighborhood, string? reference, decimal? latitude, decimal? longitude)
    {
        if (latitude is < -90 or > 90) throw new ArgumentOutOfRangeException(nameof(latitude), "Latitude must be between -90 and 90.");
        if (longitude is < -180 or > 180) throw new ArgumentOutOfRangeException(nameof(longitude), "Longitude must be between -180 and 180.");
        if (latitude.HasValue != longitude.HasValue) throw new ArgumentException("Latitude and longitude must be provided together.");

        Address = Normalize(address, 300, nameof(address));
        City = Normalize(city, 120, nameof(city));
        Neighborhood = Normalize(neighborhood, 120, nameof(neighborhood));
        Reference = Normalize(reference, 300, nameof(reference));
        Latitude = latitude;
        Longitude = longitude;
        Touch();
    }

    public void SetActive(bool active) { IsActive = active; Touch(); }

    private static string? Normalize(string? value, int maxLength, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim();
        if (normalized.Length > maxLength) throw new ArgumentException($"Maximum length is {maxLength} characters.", parameterName);
        return normalized;
    }
}

public sealed class Customer : BaseEntity
{
    private Customer() { }

    public Customer(Guid barberShopId, string name, string? phone, string? email)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));

        BarberShopId = barberShopId;
        Name = name.Trim();
        Phone = Normalize(phone);
        Email = Normalize(email)?.ToLowerInvariant();
    }

    public Guid BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void Update(string name, string? phone, string? email)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        Name = name.Trim();
        Phone = Normalize(phone);
        Email = Normalize(email)?.ToLowerInvariant();
        Touch();
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public enum AppointmentStatus
{
    Confirmed = 1,
    CheckedIn = 2,
    Completed = 3,
    Cancelled = 4,
    NoShow = 5
}

public sealed class Appointment : BaseEntity
{
    private Appointment() { }

    public Appointment(
        Guid barberShopId,
        Guid serviceId,
        Guid barberId,
        DateTimeOffset startsAtUtc,
        DateTimeOffset endsAtUtc,
        string customerName,
        string? customerPhone,
        string? customerEmail,
        string publicLookupTokenHash,
        Guid? customerId = null)
    {
        if (barberShopId == Guid.Empty || serviceId == Guid.Empty || barberId == Guid.Empty)
            throw new ArgumentException("Barbershop, service and barber are required.");
        if (startsAtUtc >= endsAtUtc)
            throw new ArgumentException("The appointment end must be after its start.");
        if (string.IsNullOrWhiteSpace(customerName))
            throw new ArgumentException("Customer name is required.", nameof(customerName));

        BarberShopId = barberShopId;
        ServiceId = serviceId;
        BarberId = barberId;
        StartsAtUtc = startsAtUtc;
        EndsAtUtc = endsAtUtc;
        CustomerId = customerId;
        CustomerName = customerName.Trim();
        CustomerPhone = Normalize(customerPhone);
        CustomerEmail = Normalize(customerEmail)?.ToLowerInvariant();
        PublicLookupTokenHash = publicLookupTokenHash;
        Status = AppointmentStatus.Confirmed;
    }

    public Guid BarberShopId { get; private set; }
    public Guid ServiceId { get; private set; }
    public Guid BarberId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public DateTimeOffset StartsAtUtc { get; private set; }
    public DateTimeOffset EndsAtUtc { get; private set; }
    public string CustomerName { get; private set; } = string.Empty;
    public string? CustomerPhone { get; private set; }
    public string? CustomerEmail { get; private set; }
    public string PublicLookupTokenHash { get; private set; } = string.Empty;
    public AppointmentStatus Status { get; private set; }
    public byte[] RowVersion { get; private set; } = [];

    public void Reschedule(DateTimeOffset startsAtUtc, DateTimeOffset endsAtUtc, Guid barberId)
    {
        if (Status != AppointmentStatus.Confirmed)
            throw new InvalidOperationException("Only confirmed appointments can be rescheduled.");
        if (startsAtUtc >= endsAtUtc)
            throw new ArgumentException("The appointment end must be after its start.");
        StartsAtUtc = startsAtUtc;
        EndsAtUtc = endsAtUtc;
        BarberId = barberId;
        Touch();
    }

    public void CheckIn()
    {
        if (Status != AppointmentStatus.Confirmed)
            throw new InvalidOperationException("Only confirmed appointments can be checked in.");
        Status = AppointmentStatus.CheckedIn;
        Touch();
    }

    public void Complete()
    {
        if (Status is not (AppointmentStatus.Confirmed or AppointmentStatus.CheckedIn))
            throw new InvalidOperationException("The appointment cannot be completed.");
        Status = AppointmentStatus.Completed;
        Touch();
    }

    public void Cancel()
    {
        if (Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled)
            throw new InvalidOperationException("The appointment cannot be cancelled.");
        Status = AppointmentStatus.Cancelled;
        Touch();
    }

    public void MarkNoShow()
    {
        if (Status != AppointmentStatus.Confirmed)
            throw new InvalidOperationException("Only confirmed appointments can be marked as no-show.");
        Status = AppointmentStatus.NoShow;
        Touch();
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class BlockedTime : BaseEntity
{
    private BlockedTime() { }

    public BlockedTime(Guid barberShopId, Guid barberId, DateTimeOffset startsAtUtc, DateTimeOffset endsAtUtc, string reason)
    {
        if (startsAtUtc >= endsAtUtc)
            throw new ArgumentException("The block end must be after its start.");
        BarberShopId = barberShopId;
        BarberId = barberId;
        StartsAtUtc = startsAtUtc;
        EndsAtUtc = endsAtUtc;
        Reason = string.IsNullOrWhiteSpace(reason) ? "Unavailable" : reason.Trim();
    }

    public Guid BarberShopId { get; private set; }
    public Guid BarberId { get; private set; }
    public DateTimeOffset StartsAtUtc { get; private set; }
    public DateTimeOffset EndsAtUtc { get; private set; }
    public string Reason { get; private set; } = string.Empty;
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    Transfer = 3,
    PayPal = 4,
    Other = 5
}

public enum PaymentStatus
{
    Pending = 1,
    Paid = 2,
    Refunded = 3,
    Failed = 4
}

public sealed class PaymentRecord : BaseEntity
{
    private PaymentRecord() { }

    public PaymentRecord(Guid barberShopId, decimal amount, string currency, PaymentMethod method, Guid? turnId, Guid? appointmentId, Guid? customerId, string? externalReference)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);
        BarberShopId = barberShopId;
        Amount = amount;
        Currency = string.IsNullOrWhiteSpace(currency) ? "DOP" : currency.Trim().ToUpperInvariant();
        Method = method;
        TurnId = turnId;
        AppointmentId = appointmentId;
        CustomerId = customerId;
        ExternalReference = externalReference;
        Status = method is PaymentMethod.Cash or PaymentMethod.Card or PaymentMethod.Transfer ? PaymentStatus.Paid : PaymentStatus.Pending;
        PaidAtUtc = Status == PaymentStatus.Paid ? DateTimeOffset.UtcNow : null;
    }

    public Guid BarberShopId { get; private set; }
    public Guid? TurnId { get; private set; }
    public Guid? AppointmentId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "DOP";
    public PaymentMethod Method { get; private set; }
    public PaymentStatus Status { get; private set; }
    public string? ExternalReference { get; private set; }
    public DateTimeOffset? PaidAtUtc { get; private set; }

    public void MarkPaid(string? externalReference)
    {
        Status = PaymentStatus.Paid;
        ExternalReference = externalReference ?? ExternalReference;
        PaidAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void Refund()
    {
        if (Status != PaymentStatus.Paid)
            throw new InvalidOperationException("Only paid records can be refunded.");
        Status = PaymentStatus.Refunded;
        Touch();
    }
}

public sealed class Subscription : BaseEntity
{
    private Subscription() { }

    public Subscription(Guid barberShopId, SubscriptionPlan plan, string provider, string? providerSubscriptionId, DateTimeOffset periodStartsAtUtc, DateTimeOffset periodEndsAtUtc)
    {
        BarberShopId = barberShopId;
        Plan = plan;
        Provider = provider;
        ProviderSubscriptionId = providerSubscriptionId;
        PeriodStartsAtUtc = periodStartsAtUtc;
        PeriodEndsAtUtc = periodEndsAtUtc;
        Status = SubscriptionStatus.Active;
    }

    public Guid BarberShopId { get; private set; }
    public SubscriptionPlan Plan { get; private set; }
    public SubscriptionStatus Status { get; private set; }
    public string Provider { get; private set; } = string.Empty;
    public string? ProviderSubscriptionId { get; private set; }
    public DateTimeOffset PeriodStartsAtUtc { get; private set; }
    public DateTimeOffset PeriodEndsAtUtc { get; private set; }
    public bool CancelAtPeriodEnd { get; private set; }

    public void Renew(DateTimeOffset periodStartsAtUtc, DateTimeOffset periodEndsAtUtc)
    {
        PeriodStartsAtUtc = periodStartsAtUtc;
        PeriodEndsAtUtc = periodEndsAtUtc;
        Status = SubscriptionStatus.Active;
        Touch();
    }

    public void MarkPastDue()
    {
        Status = SubscriptionStatus.PastDue;
        Touch();
    }

    public void Cancel(bool atPeriodEnd)
    {
        CancelAtPeriodEnd = atPeriodEnd;
        if (!atPeriodEnd)
            Status = SubscriptionStatus.Cancelled;
        Touch();
    }
}
