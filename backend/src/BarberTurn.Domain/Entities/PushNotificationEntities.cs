namespace BarberTurn.Domain.Entities;

public enum PushPlatform
{
    Android = 1,
    Ios = 2
}

public enum PushDeliveryStatus
{
    Pending = 1,
    Processing = 2,
    Accepted = 3,
    Failed = 4
}

public sealed class PushSubscription : BaseEntity
{
    private PushSubscription() { }

    public PushSubscription(
        Guid barberShopId,
        Guid? userId,
        Guid? turnRequestId,
        Guid installationId,
        string expoPushToken,
        PushPlatform platform,
        DateTimeOffset nowUtc)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if ((userId is null) == (turnRequestId is null))
            throw new ArgumentException("Exactly one subscription owner is required.");
        if (installationId == Guid.Empty)
            throw new ArgumentException("Installation is required.", nameof(installationId));

        BarberShopId = barberShopId;
        UserId = userId;
        TurnRequestId = turnRequestId;
        InstallationId = installationId;
        Activate(expoPushToken, platform, nowUtc);
    }

    public Guid BarberShopId { get; private set; }
    public Guid? UserId { get; private set; }
    public Guid? TurnRequestId { get; private set; }
    public Guid InstallationId { get; private set; }
    public string ExpoPushToken { get; private set; } = string.Empty;
    public PushPlatform Platform { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset LastSeenAtUtc { get; private set; }

    public void Activate(string expoPushToken, PushPlatform platform, DateTimeOffset nowUtc)
    {
        if (string.IsNullOrWhiteSpace(expoPushToken))
            throw new ArgumentException("Expo push token is required.", nameof(expoPushToken));

        ExpoPushToken = expoPushToken.Trim();
        Platform = platform;
        IsActive = true;
        LastSeenAtUtc = nowUtc.ToUniversalTime();
        Touch();
    }

    public void Deactivate(DateTimeOffset nowUtc)
    {
        if (!IsActive)
            return;

        IsActive = false;
        LastSeenAtUtc = nowUtc.ToUniversalTime();
        Touch();
    }
}

public sealed class PushNotificationOutbox : BaseEntity
{
    private const int MaximumAttempts = 5;

    private PushNotificationOutbox() { }

    public PushNotificationOutbox(
        Guid pushSubscriptionId,
        string title,
        string body,
        string route,
        DateTimeOffset nowUtc)
    {
        if (pushSubscriptionId == Guid.Empty)
            throw new ArgumentException("Push subscription is required.", nameof(pushSubscriptionId));

        PushSubscriptionId = pushSubscriptionId;
        Title = Require(title, nameof(title), 100);
        Body = Require(body, nameof(body), 240);
        Route = Require(route, nameof(route), 300);
        Status = PushDeliveryStatus.Pending;
        AvailableAtUtc = nowUtc.ToUniversalTime();
    }

    public Guid PushSubscriptionId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Body { get; private set; } = string.Empty;
    public string Route { get; private set; } = string.Empty;
    public PushDeliveryStatus Status { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTimeOffset AvailableAtUtc { get; private set; }
    public DateTimeOffset? ProcessingStartedAtUtc { get; private set; }
    public DateTimeOffset? AcceptedAtUtc { get; private set; }
    public string? ExpoTicketId { get; private set; }
    public string? LastError { get; private set; }

    public void MarkAccepted(string? expoTicketId, DateTimeOffset nowUtc)
    {
        Status = PushDeliveryStatus.Accepted;
        AcceptedAtUtc = nowUtc.ToUniversalTime();
        ExpoTicketId = Trim(expoTicketId, 120);
        LastError = null;
        Touch();
    }

    public void MarkFailed(string error, DateTimeOffset nowUtc, bool retryable)
    {
        LastError = Trim(error, 500) ?? "Push delivery failed.";
        ProcessingStartedAtUtc = null;

        if (retryable && AttemptCount < MaximumAttempts)
        {
            Status = PushDeliveryStatus.Pending;
            var delayMinutes = Math.Min(30, Math.Pow(2, Math.Max(0, AttemptCount - 1)));
            AvailableAtUtc = nowUtc.ToUniversalTime().AddMinutes(delayMinutes);
        }
        else
        {
            Status = PushDeliveryStatus.Failed;
        }

        Touch();
    }

    private static string Require(string value, string parameterName, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Value is required.", parameterName);
        var trimmed = value.Trim();
        return trimmed.Length <= maximumLength
            ? trimmed
            : throw new ArgumentException($"Value cannot exceed {maximumLength} characters.", parameterName);
    }

    private static string? Trim(string? value, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        return trimmed[..Math.Min(trimmed.Length, maximumLength)];
    }
}
