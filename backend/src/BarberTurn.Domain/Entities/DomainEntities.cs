namespace BarberTurn.Domain.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTimeOffset CreatedAtUtc { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; protected set; }

    protected void Touch() => UpdatedAtUtc = DateTimeOffset.UtcNow;
}

public sealed class BarberShop : BaseEntity
{
    private BarberShop() { }

    public BarberShop(string name, string slug, string timeZoneId = "America/Santo_Domingo")
    {
        Name = Require(name, nameof(name));
        Slug = Require(slug, nameof(slug)).ToLowerInvariant();
        TimeZoneId = Require(timeZoneId, nameof(timeZoneId));
        TrialEndsAtUtc = null;
    }

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string TimeZoneId { get; private set; } = "America/Santo_Domingo";
    public SubscriptionPlan Plan { get; private set; } = SubscriptionPlan.Free;
    public SubscriptionStatus SubscriptionStatus { get; private set; } = SubscriptionStatus.Active;
    public DateTimeOffset? TrialEndsAtUtc { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void UpdateSettings(string name, string timeZoneId)
    {
        Name = Require(name, nameof(name));
        TimeZoneId = Require(timeZoneId, nameof(timeZoneId));
        Touch();
    }

    public void ChangeSubscription(SubscriptionPlan plan, SubscriptionStatus status)
    {
        Plan = plan;
        SubscriptionStatus = status;
        Touch();
    }

    private static string Require(string value, string parameterName) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("Value is required.", parameterName)
            : value.Trim();
}

public enum UserRole
{
    Owner = 1,
    Administrator = 2,
    Receptionist = 3,
    Barber = 4
}

public sealed class User : BaseEntity
{
    private User() { }

    private User(Guid? barberShopId, string name, string email, string passwordHash, UserRole role, Guid? barberId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.", nameof(email));

        BarberShopId = barberShopId;
        Name = name.Trim();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        Role = role;
        BarberId = barberId;
    }

    public User(Guid barberShopId, string name, string email, string passwordHash, UserRole role, Guid? barberId = null)
        : this(barberShopId == Guid.Empty ? throw new ArgumentException("Barbershop is required.", nameof(barberShopId)) : (Guid?)barberShopId,
            name, email, passwordHash, role, barberId)
    {
    }

    public static User CreateIndependentBarber(string name, string email, string passwordHash) =>
        new(null, name, email, passwordHash, UserRole.Barber, null);

    public Guid? BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public Guid? BarberId { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public string SecurityStamp { get; private set; } = Guid.NewGuid().ToString("N");
    public bool IsActive { get; private set; } = true;

    public void ChangePasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));

        PasswordHash = passwordHash;
        SecurityStamp = Guid.NewGuid().ToString("N");
        Touch();
    }

    public void MarkEmailVerified()
    {
        IsEmailVerified = true;
        Touch();
    }

    public void ChangeRole(UserRole role, Guid? barberId)
    {
        Role = role;
        BarberId = role == UserRole.Barber ? barberId : null;
        SecurityStamp = Guid.NewGuid().ToString("N");
        Touch();
    }

    public void AssignTenant(Guid barberShopId, UserRole role, Guid? barberId = null)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (BarberShopId.HasValue && BarberShopId.Value != barberShopId)
            throw new InvalidOperationException("The user already belongs to another barbershop.");
        if (role == UserRole.Barber && barberId is null)
            throw new ArgumentException("A barber tenant assignment requires an operational barber.", nameof(barberId));

        BarberShopId = barberShopId;
        Role = role;
        BarberId = role == UserRole.Barber ? barberId : null;
        Touch();
    }

    public void Deactivate()
    {
        IsActive = false;
        SecurityStamp = Guid.NewGuid().ToString("N");
        Touch();
    }
}

public enum SubscriptionPlan
{
    Free = 0,
    Starter = 1,
    Pro = 2,
    Business = 3
}

public enum SubscriptionStatus
{
    Trialing = 1,
    Active = 2,
    PastDue = 3,
    Cancelled = 4
}
