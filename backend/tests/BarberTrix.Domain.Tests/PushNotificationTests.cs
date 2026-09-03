using BarberTrix.Domain.Entities;

namespace BarberTrix.Domain.Tests;

public sealed class PushNotificationTests
{
    [Fact]
    public void SubscriptionRequiresExactlyOneOwnerAndCanBeReactivated()
    {
        var shopId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var installationId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        Assert.Throws<ArgumentException>(() => new PushSubscription(
            shopId,
            userId,
            Guid.NewGuid(),
            installationId,
            "ExpoPushToken[abcdefghijklmnopqrstuv]",
            PushPlatform.Android,
            now));

        var subscription = new PushSubscription(
            shopId,
            userId,
            null,
            installationId,
            "ExpoPushToken[abcdefghijklmnopqrstuv]",
            PushPlatform.Android,
            now);
        subscription.Deactivate(now.AddMinutes(1));
        Assert.False(subscription.IsActive);

        subscription.Activate("ExpoPushToken[zyxwvutsrqponmlkjihgfe]", PushPlatform.Ios, now.AddMinutes(2));
        Assert.True(subscription.IsActive);
        Assert.Equal(PushPlatform.Ios, subscription.Platform);
        Assert.Equal("ExpoPushToken[zyxwvutsrqponmlkjihgfe]", subscription.ExpoPushToken);
    }

    [Fact]
    public void OutboxMovesToAcceptedOrFailedWithoutExposingPayloadMutations()
    {
        var now = DateTimeOffset.UtcNow;
        var accepted = new PushNotificationOutbox(
            Guid.NewGuid(),
            "Solicitud aceptada",
            "Tu solicitud cambió de estado.",
            "/request-status/demo/00000000-0000-4000-8000-000000000001",
            now);
        accepted.MarkAccepted("ticket-1", now.AddSeconds(1));
        Assert.Equal(PushDeliveryStatus.Accepted, accepted.Status);
        Assert.Equal("ticket-1", accepted.ExpoTicketId);

        var failed = new PushNotificationOutbox(
            Guid.NewGuid(),
            "Solicitud actualizada",
            "Abre BarberTrix para ver el cambio.",
            "/(app)/turn-requests",
            now);
        failed.MarkFailed("Permanent rejection", now.AddSeconds(1), false);
        Assert.Equal(PushDeliveryStatus.Failed, failed.Status);
        Assert.Equal("Permanent rejection", failed.LastError);
    }
}
