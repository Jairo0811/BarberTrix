using BarberTrix.Application.Appointments;
using BarberTrix.Application.Common;
using BarberTrix.Application.Push;
using BarberTrix.Application.TurnRequests;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Infrastructure.TurnRequests;

internal sealed class TurnRequestService(
    ApplicationDbContext dbContext,
    IAppointmentService appointmentService,
    IPlanLimitService planLimitService,
    IShopLookupService shopLookupService,
    ITurnRequestPushNotifier pushNotifier,
    IQueueNotifier queueNotifier) : ITurnRequestService
{
    private static readonly TimeSpan RequestLifetime = TimeSpan.FromHours(24);

    public async Task<IReadOnlyList<TurnRequestResponse>> GetForStaffAsync(Guid barberShopId, Guid? barberId, CancellationToken cancellationToken = default)
    {
        var query = dbContext.TurnRequests.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && (barberId == null || x.BarberId == barberId))
            .OrderByDescending(x => x.CreatedAtUtc);
        var rows = await Joined(query).ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        return rows.Select(x => Map(x, now)).ToList();
    }

    public async Task<TurnRequestResponse?> GetAsync(Guid barberShopId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var row = await Joined(dbContext.TurnRequests.AsNoTracking().Where(x => x.Id == requestId && x.BarberShopId == barberShopId))
            .SingleOrDefaultAsync(cancellationToken);
        return row is null ? null : Map(row, DateTimeOffset.UtcNow);
    }

    public async Task<PublicTurnRequestResponse> CreatePublicAsync(string shopSlug, CreateTurnRequestRequest request, CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);
        var shopId = await shopLookupService.GetActiveShopIdBySlugAsync(shopSlug, cancellationToken)
            ?? throw new InvalidOperationException("The barbershop was not found.");
        await planLimitService.EnsureCanUseAsync(shopId, PlanFeature.Appointments, cancellationToken);
        await appointmentService.EnsureSlotAvailableAsync(shopId, request.ServiceId, request.BarberId, request.RequestedStartsAt, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var startsAtUtc = request.RequestedStartsAt.ToUniversalTime();
        var expiresAtUtc = startsAtUtc < now.Add(RequestLifetime) ? startsAtUtc : now.Add(RequestLifetime);
        var rawToken = SecureToken.Create();
        var entity = new TurnRequest(
            shopId,
            request.ServiceId,
            request.BarberId,
            startsAtUtc,
            request.CustomerName,
            request.CustomerPhone,
            request.CustomerEmail,
            request.Notes,
            SecureToken.Hash(rawToken),
            expiresAtUtc);

        dbContext.TurnRequests.Add(entity);
        await pushNotifier.QueueForStaffAsync(shopId, entity.BarberId, entity.Id, TurnRequestPushEvent.Created, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await queueNotifier.QueueChangedAsync(shopId, "turn-request-created", cancellationToken);

        return new PublicTurnRequestResponse(
            await GetAsync(shopId, entity.Id, cancellationToken) ?? throw new InvalidOperationException("The turn request could not be loaded."),
            rawToken);
    }

    public async Task<TurnRequestResponse?> GetPublicAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(lookupToken))
            return null;
        var shopId = await shopLookupService.GetActiveShopIdBySlugAsync(shopSlug, cancellationToken);
        if (shopId is null)
            return null;
        var tokenHash = SecureToken.Hash(lookupToken);
        var row = await Joined(dbContext.TurnRequests.AsNoTracking().Where(x => x.Id == requestId && x.BarberShopId == shopId && x.PublicLookupTokenHash == tokenHash))
            .SingleOrDefaultAsync(cancellationToken);
        return row is null ? null : Map(row, DateTimeOffset.UtcNow);
    }

    public async Task<bool> CancelPublicAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var entity = await FindPublicEntityAsync(shopSlug, requestId, lookupToken, cancellationToken);
        if (entity is null)
            return false;
        await EnsureNotExpiredAsync(entity, cancellationToken);
        entity.Cancel(DateTimeOffset.UtcNow);
        await pushNotifier.QueueForStaffAsync(entity.BarberShopId, entity.BarberId, entity.Id, TurnRequestPushEvent.Cancelled, cancellationToken);
        await SaveTransitionAsync(entity.BarberShopId, "turn-request-cancelled", cancellationToken);
        return true;
    }

    public async Task<TurnRequestResponse?> AcceptCounterPublicAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var shopId = await shopLookupService.GetActiveShopIdBySlugAsync(shopSlug, cancellationToken);
        if (shopId is null || string.IsNullOrWhiteSpace(lookupToken))
            return null;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var entity = await dbContext.TurnRequests.SingleOrDefaultAsync(x => x.Id == requestId && x.BarberShopId == shopId && x.PublicLookupTokenHash == SecureToken.Hash(lookupToken), cancellationToken);
        if (entity is null)
            return null;
        await EnsureNotExpiredAsync(entity, cancellationToken);
        if (entity.Status != TurnRequestStatus.CounterProposed || entity.CounterProposedStartsAtUtc is null)
            throw new InvalidOperationException("There is no counter-proposed time to accept.");

        var appointment = await appointmentService.CreateFromTurnRequestAsync(
            entity.BarberShopId,
            entity.ServiceId,
            entity.BarberId,
            entity.CounterProposedStartsAtUtc.Value,
            entity.CustomerName,
            entity.CustomerPhone,
            entity.CustomerEmail,
            entity.PublicLookupTokenHash,
            cancellationToken);
        entity.Accept(appointment.Id, DateTimeOffset.UtcNow);
        await pushNotifier.QueueForStaffAsync(entity.BarberShopId, entity.BarberId, entity.Id, TurnRequestPushEvent.CounterAccepted, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await queueNotifier.QueueChangedAsync(entity.BarberShopId, "turn-request-accepted", cancellationToken);
        return await GetAsync(entity.BarberShopId, entity.Id, cancellationToken);
    }

    public async Task<TurnRequestResponse?> AcceptAsync(Guid barberShopId, Guid requestId, CancellationToken cancellationToken = default)
    {
        await planLimitService.EnsureCanUseAsync(barberShopId, PlanFeature.Appointments, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var entity = await dbContext.TurnRequests.SingleOrDefaultAsync(x => x.Id == requestId && x.BarberShopId == barberShopId, cancellationToken);
        if (entity is null)
            return null;
        await EnsureNotExpiredAsync(entity, cancellationToken);
        if (entity.Status != TurnRequestStatus.Pending)
            throw new InvalidOperationException(entity.Status == TurnRequestStatus.CounterProposed
                ? "The customer must accept the counter-proposed time."
                : "The turn request is no longer pending.");

        var appointment = await appointmentService.CreateFromTurnRequestAsync(
            entity.BarberShopId,
            entity.ServiceId,
            entity.BarberId,
            entity.RequestedStartsAtUtc,
            entity.CustomerName,
            entity.CustomerPhone,
            entity.CustomerEmail,
            entity.PublicLookupTokenHash,
            cancellationToken);
        entity.Accept(appointment.Id, DateTimeOffset.UtcNow);
        await pushNotifier.QueueForCustomerAsync(entity.Id, TurnRequestPushEvent.Accepted, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await queueNotifier.QueueChangedAsync(barberShopId, "turn-request-accepted", cancellationToken);
        return await GetAsync(barberShopId, requestId, cancellationToken);
    }

    public async Task<TurnRequestResponse?> RejectAsync(Guid barberShopId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.TurnRequests.SingleOrDefaultAsync(x => x.Id == requestId && x.BarberShopId == barberShopId, cancellationToken);
        if (entity is null)
            return null;
        await EnsureNotExpiredAsync(entity, cancellationToken);
        entity.Reject(DateTimeOffset.UtcNow);
        await pushNotifier.QueueForCustomerAsync(entity.Id, TurnRequestPushEvent.Rejected, cancellationToken);
        await SaveTransitionAsync(barberShopId, "turn-request-rejected", cancellationToken);
        return await GetAsync(barberShopId, requestId, cancellationToken);
    }

    public async Task<TurnRequestResponse?> CounterProposeAsync(Guid barberShopId, Guid requestId, CounterProposeTurnRequestRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.TurnRequests.SingleOrDefaultAsync(x => x.Id == requestId && x.BarberShopId == barberShopId, cancellationToken);
        if (entity is null)
            return null;
        await EnsureNotExpiredAsync(entity, cancellationToken);
        await appointmentService.EnsureSlotAvailableAsync(barberShopId, entity.ServiceId, entity.BarberId, request.StartsAt, cancellationToken);
        entity.CounterPropose(request.StartsAt.ToUniversalTime(), DateTimeOffset.UtcNow);
        await pushNotifier.QueueForCustomerAsync(entity.Id, TurnRequestPushEvent.CounterProposed, cancellationToken);
        await SaveTransitionAsync(barberShopId, "turn-request-counter-proposed", cancellationToken);
        return await GetAsync(barberShopId, requestId, cancellationToken);
    }

    private async Task<TurnRequest?> FindPublicEntityAsync(string shopSlug, Guid requestId, string lookupToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(lookupToken))
            return null;
        var shopId = await shopLookupService.GetActiveShopIdBySlugAsync(shopSlug, cancellationToken);
        if (shopId is null)
            return null;
        return await dbContext.TurnRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.BarberShopId == shopId && x.PublicLookupTokenHash == SecureToken.Hash(lookupToken),
            cancellationToken);
    }

    private async Task EnsureNotExpiredAsync(TurnRequest entity, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        if (!entity.IsExpired(now))
            return;
        entity.MarkExpired(now);
        await dbContext.SaveChangesAsync(cancellationToken);
        throw new InvalidOperationException("The turn request has expired.");
    }

    private async Task SaveTransitionAsync(Guid barberShopId, string eventName, CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvalidOperationException("The turn request changed. Refresh and try again.");
        }
        await queueNotifier.QueueChangedAsync(barberShopId, eventName, cancellationToken);
    }

    private IQueryable<TurnRequestJoin> Joined(IQueryable<TurnRequest> requests) =>
        from request in requests
        join service in dbContext.BarberServices.AsNoTracking() on request.ServiceId equals service.Id
        join barber in dbContext.Barbers.AsNoTracking() on request.BarberId equals barber.Id
        select new TurnRequestJoin(request, service.Name, barber.Name);

    private static TurnRequestResponse Map(TurnRequestJoin row, DateTimeOffset nowUtc)
    {
        var status = row.Request.IsExpired(nowUtc) ? TurnRequestStatus.Expired : row.Request.Status;
        return new TurnRequestResponse(
            row.Request.Id,
            row.Request.ServiceId,
            row.ServiceName,
            row.Request.BarberId,
            row.BarberName,
            row.Request.RequestedStartsAtUtc,
            row.Request.CounterProposedStartsAtUtc,
            row.Request.EffectiveStartsAtUtc,
            row.Request.CustomerName,
            row.Request.CustomerPhone,
            row.Request.CustomerEmail,
            row.Request.Notes,
            status,
            row.Request.ExpiresAtUtc,
            row.Request.RespondedAtUtc,
            row.Request.AppointmentId,
            row.Request.CreatedAtUtc);
    }

    private static void ValidateRequest(CreateTurnRequestRequest request)
    {
        if (request.ServiceId == Guid.Empty || request.BarberId == Guid.Empty)
            throw new ArgumentException("Service and barber are required.");
        if (string.IsNullOrWhiteSpace(request.CustomerName) || request.CustomerName.Trim().Length > 120)
            throw new ArgumentException("A valid customer name is required.");
        if (request.CustomerPhone?.Trim().Length > 40)
            throw new ArgumentException("Customer phone is too long.");
        if (request.CustomerEmail?.Trim().Length > 180)
            throw new ArgumentException("Customer email is too long.");
        if (request.Notes?.Trim().Length > 500)
            throw new ArgumentException("Notes cannot exceed 500 characters.");
    }

    private sealed record TurnRequestJoin(TurnRequest Request, string ServiceName, string BarberName);
}
