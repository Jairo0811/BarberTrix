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

    public BarberShop(string name, string slug)
    {
        Name = Require(name, nameof(name));
        Slug = Require(slug, nameof(slug)).ToLowerInvariant();
    }

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;

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

    public User(Guid barberShopId, string name, string email, string passwordHash, UserRole role)
    {
        BarberShopId = barberShopId;
        Name = name.Trim();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        Role = role;
    }

    public Guid BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void ChangePasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));

        PasswordHash = passwordHash;
        Touch();
    }
}
