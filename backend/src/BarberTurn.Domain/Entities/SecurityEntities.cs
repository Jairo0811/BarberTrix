using System.Security.Cryptography;
using System.Text;

namespace BarberTurn.Domain.Entities;

public sealed class RefreshSession : BaseEntity
{
    private RefreshSession() { }

    public RefreshSession(Guid userId, string tokenHash, DateTimeOffset expiresAtUtc, string? userAgent, string? ipAddress)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("User is required.", nameof(userId));

        UserId = userId;
        TokenHash = Require(tokenHash, nameof(tokenHash));
        ExpiresAtUtc = expiresAtUtc;
        UserAgent = Trim(userAgent, 300);
        IpAddress = Trim(ipAddress, 64);
    }

    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }
    public string? ReplacedByTokenHash { get; private set; }
    public string? UserAgent { get; private set; }
    public string? IpAddress { get; private set; }
    public bool IsActive => RevokedAtUtc is null && ExpiresAtUtc > DateTimeOffset.UtcNow;

    public void Revoke(string? replacementTokenHash = null)
    {
        if (RevokedAtUtc is not null)
            return;

        RevokedAtUtc = DateTimeOffset.UtcNow;
        ReplacedByTokenHash = replacementTokenHash;
        Touch();
    }

    private static string Require(string value, string parameterName) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException("Value is required.", parameterName) : value.Trim();

    private static string? Trim(string? value, int length) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, length)];
}

public sealed class TeamInvitation : BaseEntity
{
    private TeamInvitation() { }

    public TeamInvitation(Guid barberShopId, string email, string name, UserRole role, Guid? barberId, string tokenHash, DateTimeOffset expiresAtUtc)
    {
        BarberShopId = barberShopId;
        Email = email.Trim().ToLowerInvariant();
        Name = name.Trim();
        Role = role;
        BarberId = barberId;
        TokenHash = tokenHash;
        ExpiresAtUtc = expiresAtUtc;
    }

    public Guid BarberShopId { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public Guid? BarberId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? AcceptedAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }
    public bool IsUsable => AcceptedAtUtc is null && RevokedAtUtc is null && ExpiresAtUtc > DateTimeOffset.UtcNow;

    public void Accept()
    {
        if (!IsUsable)
            throw new InvalidOperationException("The invitation is no longer valid.");
        AcceptedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void Revoke()
    {
        RevokedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }
}

public sealed class EmailVerificationToken : BaseEntity
{
    private EmailVerificationToken() { }

    public EmailVerificationToken(Guid userId, string tokenHash, DateTimeOffset expiresAtUtc)
    {
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAtUtc = expiresAtUtc;
    }

    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; private set; }
    public DateTimeOffset? UsedAtUtc { get; private set; }
    public bool IsUsable => UsedAtUtc is null && ExpiresAtUtc > DateTimeOffset.UtcNow;

    public void MarkUsed()
    {
        UsedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }
}

public sealed class AuditLog : BaseEntity
{
    private AuditLog() { }

    public AuditLog(Guid barberShopId, Guid? userId, string action, string resourceType, string? resourceId, string? metadata, string? ipAddress)
    {
        BarberShopId = barberShopId;
        UserId = userId;
        Action = action;
        ResourceType = resourceType;
        ResourceId = resourceId;
        Metadata = metadata;
        IpAddress = ipAddress;
    }

    public Guid BarberShopId { get; private set; }
    public Guid? UserId { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public string ResourceType { get; private set; } = string.Empty;
    public string? ResourceId { get; private set; }
    public string? Metadata { get; private set; }
    public string? IpAddress { get; private set; }
}

public static class SecureToken
{
    public static string Create() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
        .TrimEnd('=')
        .Replace('+', '-')
        .Replace('/', '_');

    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
