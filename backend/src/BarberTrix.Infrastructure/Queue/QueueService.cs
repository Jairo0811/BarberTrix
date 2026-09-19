using System.Data;
using BarberTrix.Application.Common;
using BarberTrix.Application.Queue;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Infrastructure.Queue;

internal sealed class QueueService(
    ApplicationDbContext dbContext,
    IPlanLimitService planLimitService,
    IQueueNotifier queueNotifier) : IQueueService
{
    public async Task<IReadOnlyList<BarberResponse>> GetBarbersAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.Barbers.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .OrderBy(x => x.ChairNumber)
            .Select(x => new BarberResponse(x.Id, x.Name, x.ChairNumber, x.Status, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<BarberResponse> CreateBarberAsync(Guid barberShopId, CreateBarberRequest request, CancellationToken cancellationToken = default)
    {
        await planLimitService.EnsureCanAddBarberAsync(barberShopId, cancellationToken);
        var barber = new Barber(barberShopId, request.Name, request.ChairNumber);
        dbContext.Barbers.Add(barber);
        await dbContext.SaveChangesAsync(cancellationToken);
        await NotifyAsync(barberShopId, "barber-created", cancellationToken);
        return MapBarber(barber);
    }

    public async Task<BarberResponse?> UpdateBarberAsync(Guid barberShopId, Guid barberId, UpdateBarberRequest request, CancellationToken cancellationToken = default)
    {
        var barber = await dbContext.Barbers.SingleOrDefaultAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken);
        if (barber is null)
            return null;
        barber.Update(request.Name, request.ChairNumber);
        barber.SetActive(request.IsActive);
        await dbContext.SaveChangesAsync(cancellationToken);
        await NotifyAsync(barberShopId, "barber-updated", cancellationToken);
        return MapBarber(barber);
    }

    public async Task<BarberResponse?> ChangeBarberStatusAsync(Guid barberShopId, Guid barberId, ChangeBarberStatusRequest request, CancellationToken cancellationToken = default)
    {
        var barber = await dbContext.Barbers.SingleOrDefaultAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken);
        if (barber is null)
            return null;
        if (!barber.IsActive)
            throw new InvalidOperationException("An inactive barber cannot change status.");
        if (!Enum.IsDefined(request.Status))
            throw new BusinessRuleException("BARBER_STATUS_INVALID", "Select a valid availability status.");
        if (request.Status == BarberStatus.Busy || barber.Status == BarberStatus.Busy)
            throw new BusinessRuleException("BARBER_SERVICE_ACTIVE", "Finish the active service before changing availability.");
        barber.ChangeStatus(request.Status);
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        {
            throw new BusinessRuleException("QUEUE_CONFLICT", "Availability changed. Refresh and try again.");
        }
        await NotifyAsync(barberShopId, "barber-status-changed", cancellationToken);
        return MapBarber(barber);
    }

    public async Task<IReadOnlyList<ServiceResponse>> GetServicesAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.BarberServices.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .OrderBy(x => x.Name)
            .Select(x => new ServiceResponse(x.Id, x.Name, x.Description, x.Price, x.EstimatedDurationMinutes, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<ServiceResponse> CreateServiceAsync(Guid barberShopId, CreateServiceRequest request, CancellationToken cancellationToken = default)
    {
        await planLimitService.EnsureCanAddServiceAsync(barberShopId, cancellationToken);
        var service = new BarberService(barberShopId, request.Name, request.Price, request.EstimatedDurationMinutes, request.Description);
        dbContext.BarberServices.Add(service);
        await dbContext.SaveChangesAsync(cancellationToken);
        await NotifyAsync(barberShopId, "service-created", cancellationToken);
        return MapService(service);
    }

    public async Task<ServiceResponse?> UpdateServiceAsync(Guid barberShopId, Guid serviceId, UpdateServiceRequest request, CancellationToken cancellationToken = default)
    {
        var service = await dbContext.BarberServices.SingleOrDefaultAsync(x => x.Id == serviceId && x.BarberShopId == barberShopId, cancellationToken);
        if (service is null)
            return null;
        service.Update(request.Name, request.Price, request.EstimatedDurationMinutes, request.Description);
        service.SetActive(request.IsActive);
        await dbContext.SaveChangesAsync(cancellationToken);
        await NotifyAsync(barberShopId, "service-updated", cancellationToken);
        return MapService(service);
    }

    public async Task<IReadOnlyList<TurnResponse>> GetQueueAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var today = await GetLocalDateAsync(barberShopId, cancellationToken);
        var turns = dbContext.Turns.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.QueueDate == today &&
                        x.Status != TurnStatus.Completed && x.Status != TurnStatus.Cancelled && x.Status != TurnStatus.NoShow)
            .OrderBy(x => x.SequenceNumber);
        var rows = await JoinTurns(turns).ToListAsync(cancellationToken);
        return rows.Select(x => MapTurn(x.Turn, x.Service, x.Barber)).ToList();
    }

    public async Task<IReadOnlyList<TurnResponse>> GetHistoryAsync(Guid barberShopId, DateOnly fromDate, DateOnly toDate, int take, CancellationToken cancellationToken = default)
    {
        if (fromDate > toDate)
            throw new ArgumentException("The from date must not be after the to date.");
        take = Math.Clamp(take, 1, 500);
        var usage = await planLimitService.GetUsageAsync(barberShopId, cancellationToken);
        if (usage.HistoryRetentionDays != int.MaxValue)
        {
            var today = await GetLocalDateAsync(barberShopId, cancellationToken);
            var minimumDate = today.AddDays(-(usage.HistoryRetentionDays - 1));
            if (fromDate < minimumDate) fromDate = minimumDate;
            if (fromDate > toDate) return [];
        }
        var turns = dbContext.Turns.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.QueueDate >= fromDate && x.QueueDate <= toDate)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(take);
        var rows = await JoinTurns(turns).ToListAsync(cancellationToken);
        return rows.Select(x => MapTurn(x.Turn, x.Service, x.Barber)).ToList();
    }

    public async Task<QueueMetricsResponse> GetMetricsAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var today = await GetLocalDateAsync(barberShopId, cancellationToken);
        var statuses = await dbContext.Turns.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.QueueDate == today)
            .GroupBy(x => x.Status)
            .Select(x => new { Status = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);
        var available = await dbContext.Barbers.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive && x.Status == BarberStatus.Available, cancellationToken);
        var wait = await EstimateWaitAsync(barberShopId, today, null, cancellationToken);
        return new QueueMetricsResponse(GetCount(TurnStatus.Waiting), GetCount(TurnStatus.Called), GetCount(TurnStatus.InService),
            GetCount(TurnStatus.Completed), GetCount(TurnStatus.Cancelled), GetCount(TurnStatus.NoShow), available, wait);

        int GetCount(TurnStatus status) => statuses.GetValueOrDefault(status);
    }

    public async Task<TurnResponse> CreateTurnAsync(Guid barberShopId, CreateTurnRequest request, CancellationToken cancellationToken = default) =>
        (await CreateTurnCoreAsync(barberShopId, request, null, cancellationToken)).Turn;

    public Task<TurnResponse?> CallTurnAsync(Guid barberShopId, Guid turnId, Guid barberId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn =>
        {
            var barber = await dbContext.Barbers.SingleOrDefaultAsync(x => x.Id == barberId && x.BarberShopId == barberShopId && x.IsActive, cancellationToken);
            if (barber is null)
                throw new InvalidOperationException("The selected barber does not exist or is inactive.");
            if (barber.Status != BarberStatus.Available)
                throw new InvalidOperationException("The selected barber is not available for service.");
            var hasActiveTurn = await dbContext.Turns.AnyAsync(x => x.BarberShopId == barberShopId && x.BarberId == barberId &&
                (x.Status == TurnStatus.Called || x.Status == TurnStatus.InService), cancellationToken);
            if (hasActiveTurn)
                throw new InvalidOperationException("The selected barber already has an active turn.");
            turn.Call(barberId);
            barber.ChangeStatus(BarberStatus.Busy);
        }, "turn-called", cancellationToken);

    public Task<TurnResponse?> StartTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, turn => { turn.StartService(); return Task.CompletedTask; }, "turn-started", cancellationToken);

    public Task<TurnResponse?> CompleteTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn => { turn.Complete(); await ReleaseBarberAsync(barberShopId, turn.BarberId, cancellationToken); }, "turn-completed", cancellationToken);

    public Task<TurnResponse?> CancelTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn =>
        {
            var releaseBarber = turn.Status == TurnStatus.Called;
            turn.Cancel();
            if (releaseBarber)
                await ReleaseBarberAsync(barberShopId, turn.BarberId, cancellationToken);
        }, "turn-cancelled", cancellationToken);

    public Task<TurnResponse?> MarkNoShowAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn => { turn.MarkNoShow(); await ReleaseBarberAsync(barberShopId, turn.BarberId, cancellationToken); }, "turn-no-show", cancellationToken);

    public async Task<PublicShopResponse?> GetPublicShopAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(slug);
        var shop = await dbContext.BarberShops.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken);
        if (shop is null)
            return null;
        var services = await GetServicesAsync(shop.Id, cancellationToken);
        var barbers = await GetBarbersAsync(shop.Id, cancellationToken);
        return new PublicShopResponse(shop.Id, shop.Name, shop.Slug, shop.TimeZoneId, services.Where(x => x.IsActive).ToList(), barbers.Where(x => x.IsActive).ToList());
    }

    public async Task<PublicTurnResponse> CreatePublicTurnAsync(string slug, PublicCreateTurnRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(slug);
        var shop = await dbContext.BarberShops.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barbershop was not found.");
        var publicIdempotencyKey = NormalizePublicIdempotencyKey(request.IdempotencyKey);
        var lookupToken = publicIdempotencyKey ?? SecureToken.Create();
        var create = new CreateTurnRequest(request.ServiceId, request.CustomerName, request.BarberId, request.CustomerPhone, publicIdempotencyKey);
        var result = await CreateTurnCoreAsync(shop.Id, create, SecureToken.Hash(lookupToken), cancellationToken);
        var position = await GetPositionAsync(shop.Id, result.Turn.Id, cancellationToken);
        var wait = await EstimateWaitAsync(shop.Id, await GetLocalDateAsync(shop.Id, cancellationToken), result.Turn.Id, cancellationToken);
        return new PublicTurnResponse(result.Turn, lookupToken, position, wait);
    }

    public async Task<PublicQueueDisplayResponse?> GetPublicQueueAsync(string slug, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(slug);
        var shop = await dbContext.BarberShops.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken);
        if (shop is null)
            return null;
        var queue = await GetQueueAsync(shop.Id, cancellationToken);
        var today = await GetLocalDateAsync(shop.Id, cancellationToken);
        var turns = queue.Select(x => new PublicQueueItemResponse(x.TicketNumber, x.Status, x.BarberName, x.ChairNumber)).ToList();
        return new PublicQueueDisplayResponse(shop.Name, turns, await EstimateWaitAsync(shop.Id, today, null, cancellationToken), DateTimeOffset.UtcNow);
    }

    public async Task<PublicTurnStatusResponse?> GetPublicTurnAsync(string slug, Guid turnId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var shopId = await GetShopIdBySlugAsync(slug, cancellationToken);
        if (shopId is null)
            return null;
        var tokenHash = SecureToken.Hash(lookupToken);
        var turn = await dbContext.Turns.AsNoTracking().SingleOrDefaultAsync(x => x.Id == turnId && x.BarberShopId == shopId && x.PublicLookupTokenHash == tokenHash, cancellationToken);
        if (turn is null)
            return null;
        var response = await GetTurnResponseAsync(shopId.Value, turnId, cancellationToken);
        return response is null ? null : new PublicTurnStatusResponse(response, await GetPositionAsync(shopId.Value, turnId, cancellationToken), await EstimateWaitAsync(shopId.Value, turn.QueueDate, turnId, cancellationToken));
    }

    public async Task<bool> CancelPublicTurnAsync(string slug, Guid turnId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var shopId = await GetShopIdBySlugAsync(slug, cancellationToken);
        if (shopId is null)
            return false;
        var tokenHash = SecureToken.Hash(lookupToken);
        var turn = await dbContext.Turns.SingleOrDefaultAsync(x => x.Id == turnId && x.BarberShopId == shopId && x.PublicLookupTokenHash == tokenHash, cancellationToken);
        if (turn is null)
            return false;
        turn.Cancel();
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvalidOperationException("The turn was changed by another operation. Refresh and try again.");
        }
        await NotifyAsync(shopId.Value, "turn-cancelled", cancellationToken);
        return true;
    }

    private async Task<(TurnResponse Turn, bool Existing)> CreateTurnCoreAsync(Guid barberShopId, CreateTurnRequest request, string? publicTokenHash, CancellationToken cancellationToken)
    {
        if (!await dbContext.BarberServices.AnyAsync(x => x.Id == request.ServiceId && x.BarberShopId == barberShopId && x.IsActive, cancellationToken))
            throw new InvalidOperationException("The selected service does not exist or is inactive.");
        if (request.BarberId is Guid barberId && !await dbContext.Barbers.AnyAsync(x => x.Id == barberId && x.BarberShopId == barberShopId && x.IsActive, cancellationToken))
            throw new InvalidOperationException("The selected barber does not exist or is inactive.");

        var idempotencyKey = NormalizeIdempotencyKey(request.IdempotencyKey);
        var today = await GetLocalDateAsync(barberShopId, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        if (idempotencyKey is not null)
        {
            await AcquireIdempotencyLockAsync(barberShopId, idempotencyKey, cancellationToken);
            var existingId = await dbContext.Turns.AsNoTracking()
                .Where(x => x.BarberShopId == barberShopId && x.IdempotencyKey == idempotencyKey)
                .Select(x => (Guid?)x.Id)
                .SingleOrDefaultAsync(cancellationToken);
            if (existingId is Guid id)
            {
                var existing = await GetTurnResponseAsync(barberShopId, id, cancellationToken)
                    ?? throw new InvalidOperationException("Existing turn could not be loaded.");
                await transaction.CommitAsync(cancellationToken);
                return (existing, true);
            }
        }

        await planLimitService.EnsureCanCreateTurnAsync(barberShopId, cancellationToken);
        var lastSequence = await dbContext.Turns.Where(x => x.BarberShopId == barberShopId && x.QueueDate == today).MaxAsync(x => (int?)x.SequenceNumber, cancellationToken) ?? 0;
        var turn = new Turn(barberShopId, request.ServiceId, today, lastSequence + 1, request.CustomerName, request.BarberId, request.CustomerPhone, publicTokenHash, idempotencyKey, request.AppointmentId);
        dbContext.Turns.Add(turn);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var response = await GetTurnResponseAsync(barberShopId, turn.Id, cancellationToken) ?? throw new InvalidOperationException("The turn could not be loaded after creation.");
        await NotifyAsync(barberShopId, "turn-created", cancellationToken);
        return (response, false);
    }

    private async Task AcquireIdempotencyLockAsync(Guid barberShopId, string idempotencyKey, CancellationToken cancellationToken)
    {
        var resource = $"barbertrix:turn:{barberShopId:N}:{idempotencyKey}";
        var affected = await dbContext.Database.ExecuteSqlInterpolatedAsync($"""
            DECLARE @lockResult int;
            EXEC @lockResult = sys.sp_getapplock
                @Resource = {resource},
                @LockMode = 'Exclusive',
                @LockOwner = 'Transaction',
                @LockTimeout = 10000;
            IF @lockResult < 0 THROW 51000, 'Could not acquire the turn idempotency lock.', 1;
            """, cancellationToken);
        _ = affected;
    }

    private async Task<TurnResponse?> MutateTurnAsync(Guid barberShopId, Guid turnId, Func<Turn, Task> mutation, string eventName, CancellationToken cancellationToken)
    {
        var turn = await dbContext.Turns.SingleOrDefaultAsync(x => x.Id == turnId && x.BarberShopId == barberShopId, cancellationToken);
        if (turn is null)
            return null;
        await mutation(turn);
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { throw new InvalidOperationException("The turn was changed by another operation. Refresh and try again."); }
        await NotifyAsync(barberShopId, eventName, cancellationToken);
        return await GetTurnResponseAsync(barberShopId, turnId, cancellationToken);
    }

    private async Task ReleaseBarberAsync(Guid barberShopId, Guid? barberId, CancellationToken cancellationToken)
    {
        if (barberId is not Guid id)
            return;
        var barber = await dbContext.Barbers.SingleAsync(x => x.Id == id && x.BarberShopId == barberShopId, cancellationToken);
        barber.ChangeStatus(BarberStatus.Available);
    }

    private async Task<TurnResponse?> GetTurnResponseAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken)
    {
        var row = await JoinTurns(dbContext.Turns.AsNoTracking().Where(x => x.BarberShopId == barberShopId && x.Id == turnId))
            .SingleOrDefaultAsync(cancellationToken);
        return row is null ? null : MapTurn(row.Turn, row.Service, row.Barber);
    }

    private IQueryable<TurnJoin> JoinTurns(IQueryable<Turn> turns) =>
        from turn in turns
        join service in dbContext.BarberServices.AsNoTracking() on turn.ServiceId equals service.Id
        join barber in dbContext.Barbers.AsNoTracking() on turn.BarberId equals barber.Id into barberJoin
        from barber in barberJoin.DefaultIfEmpty()
        select new TurnJoin(turn, service, barber);

    private async Task<DateOnly> GetLocalDateAsync(Guid barberShopId, CancellationToken cancellationToken)
    {
        var timeZoneId = await dbContext.BarberShops.AsNoTracking().Where(x => x.Id == barberShopId).Select(x => x.TimeZoneId).SingleAsync(cancellationToken);
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone).DateTime);
    }

    private async Task<Guid?> GetShopIdBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var normalizedSlug = NormalizeSlug(slug);
        return await dbContext.BarberShops.AsNoTracking().Where(x => x.Slug == normalizedSlug && x.IsActive).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
    }

    private async Task<int> GetPositionAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken)
    {
        var turn = await dbContext.Turns.AsNoTracking().SingleAsync(x => x.Id == turnId && x.BarberShopId == barberShopId, cancellationToken);
        if (turn.Status != TurnStatus.Waiting)
            return 0;
        return await dbContext.Turns.CountAsync(x => x.BarberShopId == barberShopId && x.QueueDate == turn.QueueDate && x.Status == TurnStatus.Waiting && x.SequenceNumber <= turn.SequenceNumber, cancellationToken);
    }

    private async Task<int> EstimateWaitAsync(Guid barberShopId, DateOnly date, Guid? throughTurnId, CancellationToken cancellationToken)
    {
        var query = dbContext.Turns.AsNoTracking().Where(x => x.BarberShopId == barberShopId && x.QueueDate == date && x.Status == TurnStatus.Waiting);
        if (throughTurnId is Guid turnId)
        {
            var sequence = await dbContext.Turns.AsNoTracking().Where(x => x.Id == turnId && x.BarberShopId == barberShopId).Select(x => x.SequenceNumber).SingleAsync(cancellationToken);
            query = query.Where(x => x.SequenceNumber < sequence);
        }
        var totalMinutes = await query.Join(dbContext.BarberServices, turn => turn.ServiceId, service => service.Id, (_, service) => service.EstimatedDurationMinutes).SumAsync(cancellationToken);
        var activeBarbers = await dbContext.Barbers.CountAsync(x => x.BarberShopId == barberShopId && x.IsActive && x.Status != BarberStatus.Offline, cancellationToken);
        return activeBarbers == 0 ? totalMinutes : (int)Math.Ceiling(totalMinutes / (double)activeBarbers);
    }

    private Task NotifyAsync(Guid barberShopId, string eventName, CancellationToken cancellationToken) => queueNotifier.QueueChangedAsync(barberShopId, eventName, cancellationToken);

    private static string? NormalizeIdempotencyKey(string? idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return null;
        var normalized = idempotencyKey.Trim();
        if (normalized.Length > 100)
            throw new ArgumentException("The idempotency key cannot exceed 100 characters.", nameof(idempotencyKey));
        return normalized;
    }

    private static string? NormalizePublicIdempotencyKey(string? idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return null;
        if (!Guid.TryParse(idempotencyKey.Trim(), out var parsed))
            throw new ArgumentException("The public idempotency key must be a UUID.", nameof(idempotencyKey));
        return parsed.ToString("N");
    }

    private static string NormalizeSlug(string slug) => slug.Trim().ToLowerInvariant();
    private static BarberResponse MapBarber(Barber x) => new(x.Id, x.Name, x.ChairNumber, x.Status, x.IsActive);
    private static ServiceResponse MapService(BarberService x) => new(x.Id, x.Name, x.Description, x.Price, x.EstimatedDurationMinutes, x.IsActive);
    private static TurnResponse MapTurn(Turn turn, BarberService service, Barber? barber) => new(turn.Id, turn.TicketNumber, turn.CustomerName, turn.Status, service.Id, service.Name, barber?.Id, barber?.Name, barber?.ChairNumber, turn.CreatedAtUtc, turn.CalledAtUtc, turn.ServiceStartedAtUtc, turn.CompletedAtUtc);
    private sealed record TurnJoin(Turn Turn, BarberService Service, Barber? Barber);
}
