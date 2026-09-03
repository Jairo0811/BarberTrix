using System.Text.RegularExpressions;
using BarberTrix.Application.Push;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Infrastructure.Push;

internal sealed partial class PushSubscriptionService(ApplicationDbContext dbContext) : IPushSubscriptionService
{
    public async Task RegisterStaffAsync(
        Guid barberShopId,
        Guid userId,
        RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        Validate(request);
        var ownsAccount = await dbContext.Users.AsNoTracking().AnyAsync(
            user => user.Id == userId && user.BarberShopId == barberShopId && user.IsActive,
            cancellationToken);
        if (!ownsAccount)
            throw new InvalidOperationException("The user cannot register this installation.");

        var subscription = await dbContext.PushSubscriptions.SingleOrDefaultAsync(
            item => item.UserId == userId && item.InstallationId == request.InstallationId,
            cancellationToken);
        if (subscription is null)
        {
            subscription = new PushSubscription(
                barberShopId,
                userId,
                null,
                request.InstallationId,
                request.ExpoPushToken,
                request.Platform,
                DateTimeOffset.UtcNow);
            dbContext.PushSubscriptions.Add(subscription);
        }
        else
        {
            subscription.Activate(request.ExpoPushToken, request.Platform, DateTimeOffset.UtcNow);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> UnregisterStaffAsync(
        Guid barberShopId,
        Guid userId,
        Guid installationId,
        CancellationToken cancellationToken = default)
    {
        var subscription = await dbContext.PushSubscriptions.SingleOrDefaultAsync(
            item => item.BarberShopId == barberShopId && item.UserId == userId && item.InstallationId == installationId,
            cancellationToken);
        if (subscription is null)
            return false;

        subscription.Deactivate(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RegisterPublicAsync(
        string shopSlug,
        Guid turnRequestId,
        string lookupToken,
        RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        Validate(request);
        var turnRequest = await FindPublicTurnRequestAsync(shopSlug, turnRequestId, lookupToken, cancellationToken);
        if (turnRequest is null)
            return false;

        var subscription = await dbContext.PushSubscriptions.SingleOrDefaultAsync(
            item => item.TurnRequestId == turnRequestId && item.InstallationId == request.InstallationId,
            cancellationToken);
        if (subscription is null)
        {
            subscription = new PushSubscription(
                turnRequest.BarberShopId,
                null,
                turnRequestId,
                request.InstallationId,
                request.ExpoPushToken,
                request.Platform,
                DateTimeOffset.UtcNow);
            dbContext.PushSubscriptions.Add(subscription);
        }
        else
        {
            subscription.Activate(request.ExpoPushToken, request.Platform, DateTimeOffset.UtcNow);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UnregisterPublicAsync(
        string shopSlug,
        Guid turnRequestId,
        string lookupToken,
        Guid installationId,
        CancellationToken cancellationToken = default)
    {
        if (await FindPublicTurnRequestAsync(shopSlug, turnRequestId, lookupToken, cancellationToken) is null)
            return false;

        var subscription = await dbContext.PushSubscriptions.SingleOrDefaultAsync(
            item => item.TurnRequestId == turnRequestId && item.InstallationId == installationId,
            cancellationToken);
        if (subscription is null)
            return false;

        subscription.Deactivate(DateTimeOffset.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Task<TurnRequest?> FindPublicTurnRequestAsync(
        string shopSlug,
        Guid turnRequestId,
        string lookupToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(shopSlug) || string.IsNullOrWhiteSpace(lookupToken))
            return Task.FromResult<TurnRequest?>(null);

        var normalizedShopSlug = shopSlug.Trim().ToLowerInvariant();
        var tokenHash = SecureToken.Hash(lookupToken);
        return (
            from request in dbContext.TurnRequests
            join shop in dbContext.BarberShops on request.BarberShopId equals shop.Id
            where request.Id == turnRequestId
                && shop.Slug == normalizedShopSlug
                && shop.IsActive
                && request.PublicLookupTokenHash == tokenHash
            select request).SingleOrDefaultAsync(cancellationToken);
    }

    private static void Validate(RegisterPushSubscriptionRequest request)
    {
        if (request.InstallationId == Guid.Empty)
            throw new ArgumentException("A valid installation ID is required.");
        if (!ExpoPushTokenPattern().IsMatch(request.ExpoPushToken?.Trim() ?? string.Empty))
            throw new ArgumentException("A valid Expo push token is required.");
        if (!Enum.IsDefined(request.Platform))
            throw new ArgumentException("A supported push platform is required.");
    }

    [GeneratedRegex(@"^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{16,160}\]$", RegexOptions.CultureInvariant)]
    private static partial Regex ExpoPushTokenPattern();
}
