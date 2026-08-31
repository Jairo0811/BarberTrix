namespace BarberTurn.Domain.Entities;

public enum ShopMembershipStatus
{
    Pending = 1,
    Active = 2,
    Suspended = 3,
    Left = 4,
    Revoked = 5
}

public sealed class BarberProfile : BaseEntity
{
    private BarberProfile() { }

    public BarberProfile(Guid userId, string displayName)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("User is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name is required.", nameof(displayName));

        UserId = userId;
        DisplayName = displayName.Trim();
    }

    public Guid UserId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string? Bio { get; private set; }
    public bool IsAvailableForWork { get; private set; }

    public void Update(string displayName, string? bio, bool isAvailableForWork)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name is required.", nameof(displayName));

        DisplayName = displayName.Trim();
        Bio = string.IsNullOrWhiteSpace(bio) ? null : bio.Trim()[..Math.Min(bio.Trim().Length, 1000)];
        IsAvailableForWork = isAvailableForWork;
        Touch();
    }
}

public sealed class ShopMembership : BaseEntity
{
    private ShopMembership() { }

    public ShopMembership(Guid userId, Guid barberShopId, UserRole role, Guid? barberId = null, ShopMembershipStatus status = ShopMembershipStatus.Active)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("User is required.", nameof(userId));
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (role == UserRole.Barber && barberId is null)
            throw new ArgumentException("A barber membership must be linked to an operational barber.", nameof(barberId));

        UserId = userId;
        BarberShopId = barberShopId;
        Role = role;
        BarberId = role == UserRole.Barber ? barberId : null;
        Status = status;
    }

    public Guid UserId { get; private set; }
    public Guid BarberShopId { get; private set; }
    public UserRole Role { get; private set; }
    public Guid? BarberId { get; private set; }
    public ShopMembershipStatus Status { get; private set; }
    public DateTimeOffset? EndedAtUtc { get; private set; }

    public bool IsActive => Status == ShopMembershipStatus.Active;

    public void Activate()
    {
        Status = ShopMembershipStatus.Active;
        EndedAtUtc = null;
        Touch();
    }

    public void Suspend()
    {
        EnsureCurrent();
        Status = ShopMembershipStatus.Suspended;
        Touch();
    }

    public void Leave()
    {
        EnsureCurrent();
        Status = ShopMembershipStatus.Left;
        EndedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void Revoke()
    {
        if (Status == ShopMembershipStatus.Revoked)
            return;

        Status = ShopMembershipStatus.Revoked;
        EndedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void ReactivateAsBarber(Guid barberId)
    {
        if (barberId == Guid.Empty)
            throw new ArgumentException("Barber is required.", nameof(barberId));
        Role = UserRole.Barber;
        BarberId = barberId;
        Status = ShopMembershipStatus.Active;
        EndedAtUtc = null;
        Touch();
    }

    private void EnsureCurrent()
    {
        if (Status is ShopMembershipStatus.Left or ShopMembershipStatus.Revoked)
            throw new InvalidOperationException("An ended membership cannot be changed.");
    }
}
