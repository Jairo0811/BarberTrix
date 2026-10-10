using BarberTrix.Application.Auth;
using BarberTrix.Application.Commercial;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BarberTrix.Infrastructure.Auth;

internal sealed class AccountDeletionService(
    ApplicationDbContext dbContext,
    IBillingService billingService,
    IMemoryCache sessionCache) : IAccountDeletionService
{
    private const string ConfirmationPhrase = "DELETE";

    public async Task<AccountDeletionResponse> DeleteAsync(
        Guid userId,
        string confirmation,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(confirmation?.Trim(), ConfirmationPhrase, StringComparison.Ordinal))
            throw new ArgumentException($"Type {ConfirmationPhrase} to confirm permanent account deletion.", nameof(confirmation));

        var user = await dbContext.Users.SingleOrDefaultAsync(
            x => x.Id == userId && x.IsActive,
            cancellationToken) ?? throw new InvalidOperationException("The account is no longer active.");

        var workspaceClosed = user.Role == UserRole.Owner && user.BarberShopId.HasValue;
        var subscriptionCancelled = false;
        var cachedSessions = workspaceClosed
            ? await dbContext.Users.AsNoTracking()
                .Where(x => x.BarberShopId == user.BarberShopId && x.IsActive)
                .Select(x => new SessionCacheIdentity(x.Id, x.SecurityStamp))
                .ToListAsync(cancellationToken)
            : [new SessionCacheIdentity(user.Id, user.SecurityStamp)];

        // Never close the local workspace first and leave a paid provider subscription charging.
        // Provider cancellation intentionally happens before the database transaction. If it fails,
        // deletion is aborted and can be retried without leaving the customer locked out and billed.
        if (workspaceClosed)
        {
            var shopId = user.BarberShopId!.Value;
            var subscription = await billingService.GetSubscriptionAsync(shopId, cancellationToken);
            if (subscription.Plan != SubscriptionPlan.Free && subscription.Status != SubscriptionStatus.Cancelled)
            {
                await billingService.CancelAsync(shopId, atPeriodEnd: false, cancellationToken);
                subscriptionCancelled = true;
            }
        }

        var deletedAtUtc = DateTimeOffset.UtcNow;
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        if (workspaceClosed)
            await CloseWorkspaceAsync(user, cancellationToken);
        else
            await DeleteIdentityAsync(user, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        foreach (var identity in cachedSessions)
            sessionCache.Remove($"auth-session:{identity.UserId:N}:{identity.SecurityStamp}");

        return new AccountDeletionResponse(
            deletedAtUtc,
            workspaceClosed,
            subscriptionCancelled,
            workspaceClosed
                ? "Your account was anonymized and the BarberTrix workspace was closed. Operational records that must be retained remain associated only with the anonymized workspace identity."
                : "Your BarberTrix account was anonymized and all active sessions were removed.");
    }

    private async Task DeleteIdentityAsync(User user, CancellationToken cancellationToken)
    {
        var memberships = await dbContext.ShopMemberships
            .Where(x => x.UserId == user.Id)
            .ToListAsync(cancellationToken);
        foreach (var membership in memberships)
            membership.Revoke();

        if (user.BarberId is Guid barberId)
        {
            var barber = await dbContext.Barbers.SingleOrDefaultAsync(x => x.Id == barberId, cancellationToken);
            if (barber is not null)
            {
                barber.Update("Deleted barber", barber.ChairNumber);
                barber.SetActive(false);
            }
        }

        await RemovePrivateIdentityDataAsync([user.Id], cancellationToken);
        user.AnonymizeForDeletion();
    }

    private async Task CloseWorkspaceAsync(User owner, CancellationToken cancellationToken)
    {
        var shopId = owner.BarberShopId!.Value;
        var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == shopId, cancellationToken);
        shop.Deactivate();

        var tenantUsers = await dbContext.Users
            .Where(x => x.BarberShopId == shopId && x.IsActive)
            .ToListAsync(cancellationToken);
        var tenantUserIds = tenantUsers.Select(x => x.Id).ToArray();

        var memberships = await dbContext.ShopMemberships
            .Where(x => x.BarberShopId == shopId)
            .ToListAsync(cancellationToken);
        foreach (var membership in memberships)
            membership.Revoke();

        foreach (var tenantUser in tenantUsers)
        {
            if (tenantUser.Id != owner.Id)
                tenantUser.Deactivate();
        }

        var barbers = await dbContext.Barbers
            .Where(x => x.BarberShopId == shopId && x.IsActive)
            .ToListAsync(cancellationToken);
        foreach (var barber in barbers)
            barber.SetActive(false);

        var displays = await dbContext.TvDisplays
            .Where(x => x.BarberShopId == shopId && x.IsActive)
            .ToListAsync(cancellationToken);
        foreach (var display in displays)
            display.Revoke();

        await dbContext.TeamInvitations
            .Where(x => x.BarberShopId == shopId)
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.BarberJoinRequests
            .Where(x => x.BarberShopId == shopId)
            .ExecuteDeleteAsync(cancellationToken);

        await RemovePrivateIdentityDataAsync(tenantUserIds, cancellationToken);

        // Preserve the historical Owner -> workspace anchor after anonymization. The account remains
        // inactive with rotated credentials, but retained tenant records continue to reference a stable
        // tombstoned workspace instead of forcing EF/SQL to dismantle the retained relational graph.
        owner.AnonymizeForDeletion();
        owner.AssignTenant(shopId, UserRole.Owner);
    }

    private async Task RemovePrivateIdentityDataAsync(Guid[] userIds, CancellationToken cancellationToken)
    {
        if (userIds.Length == 0)
            return;

        await dbContext.BarberProfiles
            .Where(x => userIds.Contains(x.UserId))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.EmailVerificationTokens
            .Where(x => userIds.Contains(x.UserId))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.RefreshSessions
            .Where(x => userIds.Contains(x.UserId))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.PushSubscriptions
            .Where(x => x.UserId.HasValue && userIds.Contains(x.UserId.Value))
            .ExecuteDeleteAsync(cancellationToken);
        await dbContext.BarberJoinRequests
            .Where(x => userIds.Contains(x.UserId))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private sealed record SessionCacheIdentity(Guid UserId, string SecurityStamp);
}
