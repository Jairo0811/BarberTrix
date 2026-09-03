using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace BarberTrix.Infrastructure.Push;

internal sealed partial class PushDeliveryProcessor(
    ApplicationDbContext dbContext,
    IExpoPushGateway gateway,
    ILogger<PushDeliveryProcessor> logger)
{
    private const int BatchSize = 100;
    private static readonly TimeSpan ClaimTimeout = TimeSpan.FromMinutes(5);

    public async Task<int> ProcessBatchAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.Subtract(ClaimTimeout);
        var candidateIds = await dbContext.PushNotificationOutbox.AsNoTracking()
            .Where(item =>
                item.Status == PushDeliveryStatus.Pending && item.AvailableAtUtc <= now
                || item.Status == PushDeliveryStatus.Processing && item.ProcessingStartedAtUtc < staleBefore)
            .OrderBy(item => item.AvailableAtUtc)
            .Select(item => item.Id)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        var claimedIds = new List<Guid>(candidateIds.Count);
        foreach (var id in candidateIds)
        {
            var claimed = await dbContext.PushNotificationOutbox
                .Where(item => item.Id == id && (
                    item.Status == PushDeliveryStatus.Pending && item.AvailableAtUtc <= now
                    || item.Status == PushDeliveryStatus.Processing && item.ProcessingStartedAtUtc < staleBefore))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.Status, PushDeliveryStatus.Processing)
                    .SetProperty(item => item.ProcessingStartedAtUtc, now)
                    .SetProperty(item => item.AttemptCount, item => item.AttemptCount + 1),
                    cancellationToken);
            if (claimed == 1)
                claimedIds.Add(id);
        }

        if (claimedIds.Count == 0)
            return 0;

        var deliveries = await (
            from outbox in dbContext.PushNotificationOutbox
            join subscription in dbContext.PushSubscriptions on outbox.PushSubscriptionId equals subscription.Id
            where claimedIds.Contains(outbox.Id)
            select new Delivery(outbox, subscription)).ToListAsync(cancellationToken);

        var active = deliveries.Where(delivery => delivery.Subscription.IsActive).ToList();
        foreach (var inactive in deliveries.Where(delivery => !delivery.Subscription.IsActive))
            inactive.Outbox.MarkFailed("The push subscription is inactive.", now, false);

        if (active.Count > 0)
        {
            try
            {
                var messages = active.Select(delivery => new ExpoPushMessage(
                    delivery.Outbox.Id,
                    delivery.Subscription.ExpoPushToken,
                    delivery.Outbox.Title,
                    delivery.Outbox.Body,
                    delivery.Outbox.Route)).ToList();
                var results = await gateway.SendAsync(messages, cancellationToken);
                ApplyResults(active, results, now);
            }
            catch (Exception exception) when (
                !cancellationToken.IsCancellationRequested
                && exception is (HttpRequestException or InvalidOperationException or JsonException or OperationCanceledException))
            {
                LogExpoBatchFailure(logger, active.Count, exception);
                foreach (var delivery in active)
                    delivery.Outbox.MarkFailed("Expo push service is temporarily unavailable.", now, true);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return deliveries.Count;
    }

    private static void ApplyResults(
        IReadOnlyList<Delivery> deliveries,
        IReadOnlyList<ExpoPushResult> results,
        DateTimeOffset now)
    {
        var byOutboxId = results.ToDictionary(result => result.OutboxId);
        foreach (var delivery in deliveries)
        {
            if (!byOutboxId.TryGetValue(delivery.Outbox.Id, out var result))
            {
                delivery.Outbox.MarkFailed("Expo did not return a push ticket.", now, true);
                continue;
            }

            if (result.Accepted)
            {
                delivery.Outbox.MarkAccepted(result.TicketId, now);
                continue;
            }

            if (result.IsUnregisteredDevice)
                delivery.Subscription.Deactivate(now);
            delivery.Outbox.MarkFailed(
                result.ErrorMessage ?? result.ErrorCode ?? "Expo rejected the push notification.",
                now,
                result.IsRetryable);
        }
    }

    private sealed record Delivery(PushNotificationOutbox Outbox, PushSubscription Subscription);

    [LoggerMessage(
        EventId = 3010,
        Level = LogLevel.Warning,
        Message = "Expo push batch failed; {Count} notifications will be retried.")]
    private static partial void LogExpoBatchFailure(ILogger logger, int count, Exception exception);
}
