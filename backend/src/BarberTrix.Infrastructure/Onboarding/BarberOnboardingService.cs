using BarberTrix.Application.Onboarding;
using BarberTrix.Application.Common;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Infrastructure.Onboarding;

internal sealed class BarberOnboardingService(ApplicationDbContext dbContext, IPlanLimitService planLimits) : IBarberOnboardingService
{
    public async Task<IReadOnlyList<BarberShopDirectoryItem>> SearchShopsAsync(string? query, CancellationToken cancellationToken = default)
    {
        var normalized = query?.Trim();
        var shops = dbContext.BarberShops.AsNoTracking().Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(normalized))
            shops = shops.Where(x => x.Name.Contains(normalized) || x.Slug.Contains(normalized));

        return await shops.OrderBy(x => x.Name).Take(25)
            .Select(x => new BarberShopDirectoryItem(x.Id, x.Name, x.Slug, x.TimeZoneId))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BarberJoinRequestResponse>> GetMyJoinRequestsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await QueryBarberRequests(userId).ToListAsync(cancellationToken);

    public async Task<BarberJoinRequestResponse> RequestJoinAsync(Guid userId, Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barber account was not found.");
        if (user.BarberShopId.HasValue || user.Role != UserRole.Barber)
            throw new InvalidOperationException("Only an independent barber can request membership.");
        if (!await dbContext.BarberProfiles.AnyAsync(x => x.UserId == userId, cancellationToken))
            throw new InvalidOperationException("The barber profile is missing.");
        if (!await dbContext.BarberShops.AnyAsync(x => x.Id == barberShopId && x.IsActive, cancellationToken))
            throw new InvalidOperationException("The selected barbershop is not available.");
        if (await dbContext.ShopMemberships.AnyAsync(x => x.UserId == userId && x.BarberShopId == barberShopId && x.Status == ShopMembershipStatus.Active, cancellationToken))
            throw new InvalidOperationException("The barber already belongs to this barbershop.");

        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.UserId == userId && x.BarberShopId == barberShopId,
            cancellationToken);
        if (request is null)
        {
            request = new BarberJoinRequest(userId, barberShopId);
            dbContext.BarberJoinRequests.Add(request);
        }
        else if (request.Status == BarberJoinRequestStatus.Pending)
        {
            throw new InvalidOperationException("There is already a pending request for this barbershop.");
        }
        else
        {
            request.Reopen();
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return await (from joinRequest in dbContext.BarberJoinRequests.AsNoTracking()
                      join shop in dbContext.BarberShops.AsNoTracking() on joinRequest.BarberShopId equals shop.Id
                      where joinRequest.UserId == userId && joinRequest.Id == request.Id
                      select new BarberJoinRequestResponse(
                          joinRequest.Id,
                          joinRequest.BarberShopId,
                          shop.Name,
                          joinRequest.Status,
                          joinRequest.CreatedAtUtc,
                          joinRequest.ReviewedAtUtc,
                          joinRequest.ReviewNote))
            .SingleAsync(cancellationToken);
    }

    public async Task<bool> WithdrawJoinRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.UserId == userId,
            cancellationToken);
        if (request is null || request.Status != BarberJoinRequestStatus.Pending)
            return false;
        request.Withdraw();
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TeamBarberJoinRequestResponse>> GetPendingJoinRequestsAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await (from request in dbContext.BarberJoinRequests.AsNoTracking()
               join user in dbContext.Users.AsNoTracking() on request.UserId equals user.Id
               where request.BarberShopId == barberShopId && request.Status == BarberJoinRequestStatus.Pending
               orderby request.CreatedAtUtc
               select new TeamBarberJoinRequestResponse(request.Id, user.Id, user.Name, user.Email, request.CreatedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<bool> ApproveJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, int chairNumber, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(chairNumber);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.BarberShopId == barberShopId && x.Status == BarberJoinRequestStatus.Pending,
            cancellationToken);
        if (request is null)
            return false;
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == request.UserId && x.IsActive, cancellationToken);
        if (user is null || user.BarberShopId.HasValue || user.Role != UserRole.Barber)
            return false;
        var profile = await dbContext.BarberProfiles.SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        if (profile is null)
            return false;
        if (await dbContext.Barbers.AnyAsync(x => x.BarberShopId == barberShopId && x.ChairNumber == chairNumber, cancellationToken))
            throw new BusinessRuleException("TEAM_CHAIR_CONFLICT", "That chair number is already assigned.");
        if (await dbContext.ShopMemberships.AnyAsync(x => x.UserId == user.Id && x.BarberShopId != barberShopId && x.Status == ShopMembershipStatus.Active, cancellationToken))
            throw new InvalidOperationException("The barber already has an active membership in another barbershop.");

        try { await planLimits.EnsureCanAddBarberAsync(barberShopId, cancellationToken); }
        catch (InvalidOperationException) { throw new BusinessRuleException("PLAN_RESOURCE_LIMIT", "The plan has no capacity for another barber."); }
        var barber = new Barber(barberShopId, profile.DisplayName, chairNumber);
        dbContext.Barbers.Add(barber);
        var membership = await dbContext.ShopMemberships.SingleOrDefaultAsync(
            x => x.UserId == user.Id && x.BarberShopId == barberShopId,
            cancellationToken);
        if (membership is null)
            dbContext.ShopMemberships.Add(new ShopMembership(user.Id, barberShopId, UserRole.Barber, barber.Id));
        else
            membership.ReactivateAsBarber(barber.Id);

        user.AssignTenant(barberShopId, UserRole.Barber, barber.Id);
        request.Approve(reviewerUserId);
        var competingRequests = await dbContext.BarberJoinRequests
            .Where(x => x.UserId == user.Id && x.Id != request.Id && x.Status == BarberJoinRequestStatus.Pending)
            .ToListAsync(cancellationToken);
        competingRequests.ForEach(x => x.Withdraw());
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RejectJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, string? note, CancellationToken cancellationToken = default)
    {
        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.BarberShopId == barberShopId && x.Status == BarberJoinRequestStatus.Pending,
            cancellationToken);
        if (request is null)
            return false;
        request.Reject(reviewerUserId, note);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<BarberJoinRequestResponse> QueryBarberRequests(Guid userId) =>
        from request in dbContext.BarberJoinRequests.AsNoTracking()
        join shop in dbContext.BarberShops.AsNoTracking() on request.BarberShopId equals shop.Id
        where request.UserId == userId
        orderby request.CreatedAtUtc descending
        select new BarberJoinRequestResponse(
            request.Id,
            request.BarberShopId,
            shop.Name,
            request.Status,
            request.CreatedAtUtc,
            request.ReviewedAtUtc,
            request.ReviewNote);
}
