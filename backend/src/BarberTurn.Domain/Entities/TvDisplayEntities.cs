namespace BarberTurn.Domain.Entities;

public sealed class TvDisplay : BaseEntity
{
    private TvDisplay() { }

    public TvDisplay(Guid barberShopId, string name)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Display name is required.", nameof(name));

        BarberShopId = barberShopId;
        Name = name.Trim();
    }

    public Guid BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? PairingCodeHash { get; private set; }
    public DateTimeOffset? PairingExpiresAtUtc { get; private set; }
    public string? DisplayTokenHash { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTimeOffset? PairedAtUtc { get; private set; }
    public DateTimeOffset? LastSeenAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }

    public void IssuePairingCode(string pairingCodeHash, DateTimeOffset expiresAtUtc)
    {
        if (string.IsNullOrWhiteSpace(pairingCodeHash))
            throw new ArgumentException("Pairing code hash is required.", nameof(pairingCodeHash));
        if (expiresAtUtc <= DateTimeOffset.UtcNow)
            throw new ArgumentOutOfRangeException(nameof(expiresAtUtc), "Pairing expiry must be in the future.");

        PairingCodeHash = pairingCodeHash;
        PairingExpiresAtUtc = expiresAtUtc;
        IsActive = true;
        RevokedAtUtc = null;
        Touch();
    }

    public void Pair(string displayTokenHash)
    {
        if (string.IsNullOrWhiteSpace(displayTokenHash))
            throw new ArgumentException("Display token hash is required.", nameof(displayTokenHash));
        if (!IsActive || PairingCodeHash is null || PairingExpiresAtUtc <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("The pairing code is no longer valid.");

        DisplayTokenHash = displayTokenHash;
        PairingCodeHash = null;
        PairingExpiresAtUtc = null;
        PairedAtUtc = DateTimeOffset.UtcNow;
        LastSeenAtUtc = PairedAtUtc;
        RevokedAtUtc = null;
        Touch();
    }

    public void MarkSeen(DateTimeOffset seenAtUtc)
    {
        if (!IsActive)
            return;
        LastSeenAtUtc = seenAtUtc;
        Touch();
    }

    public void Revoke()
    {
        IsActive = false;
        PairingCodeHash = null;
        PairingExpiresAtUtc = null;
        DisplayTokenHash = null;
        RevokedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }
}
