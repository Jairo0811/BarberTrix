using System.Data;
using BarberTurn.Application.Queue;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Queue;

internal sealed class QueueService(ApplicationDbContext dbContext) : IQueueService
{
    public async Task<IReadOnlyList<BarberResponse>> GetBarbersAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.Barbers
            .AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .OrderBy(x => x.ChairNumber)
            .Select(x => new BarberResponse(x.Id, x.Name, x.ChairNumber, x.Status, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<BarberResponse> CreateBarberAsync(Guid barberShopId, CreateBarberRequest request, CancellationToken cancellationToken = default)
    {
        var barber = new Barber(barberShopId, request.Name, request.ChairNumber);
        dbContext.Barbers.Add(barber);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new BarberResponse(barber.Id, barber.Name, barber.ChairNumber, barber.Status, barber.IsActive);
    }

    public async Task<BarberResponse?> ChangeBarberStatusAsync(Guid barberShopId, Guid barberId, ChangeBarberStatusRequest request, CancellationToken cancellationToken = default)
    {
        var barber = await dbContext.Barbers.SingleOrDefaultAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken);
        if (barber is null)
            return null;

        barber.ChangeStatus(request.Status);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new BarberResponse(barber.Id, barber.Name, barber.ChairNumber, barber.Status, barber.IsActive);
    }

    public async Task<IReadOnlyList<ServiceResponse>> GetServicesAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.BarberServices
            .AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .OrderBy(x => x.Name)
            .Select(x => new ServiceResponse(x.Id, x.Name, x.Description, x.Price, x.EstimatedDurationMinutes, x.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<ServiceResponse> CreateServiceAsync(Guid barberShopId, CreateServiceRequest request, CancellationToken cancellationToken = default)
    {
        var service = new BarberService(barberShopId, request.Name, request.Price, request.EstimatedDurationMinutes, request.Description);
        dbContext.BarberServices.Add(service);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new ServiceResponse(service.Id, service.Name, service.Description, service.Price, service.EstimatedDurationMinutes, service.IsActive);
    }

    public async Task<IReadOnlyList<TurnResponse>> GetQueueAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await QueryTurns(barberShopId)
            .Where(x => x.Turn.QueueDate == today && x.Turn.Status != TurnStatus.Completed && x.Turn.Status != TurnStatus.Cancelled && x.Turn.Status != TurnStatus.NoShow)
            .OrderBy(x => x.Turn.SequenceNumber)
            .Select(x => MapTurn(x.Turn, x.Service, x.Barber))
            .ToListAsync(cancellationToken);
    }

    public async Task<TurnResponse> CreateTurnAsync(Guid barberShopId, CreateTurnRequest request, CancellationToken cancellationToken = default)
    {
        var serviceExists = await dbContext.BarberServices.AnyAsync(
            x => x.Id == request.ServiceId && x.BarberShopId == barberShopId && x.IsActive,
            cancellationToken);
        if (!serviceExists)
            throw new InvalidOperationException("The selected service does not exist or is inactive.");

        if (request.BarberId is Guid barberId)
        {
            var barberExists = await dbContext.Barbers.AnyAsync(
                x => x.Id == barberId && x.BarberShopId == barberShopId && x.IsActive,
                cancellationToken);
            if (!barberExists)
                throw new InvalidOperationException("The selected barber does not exist or is inactive.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var lastSequence = await dbContext.Turns
            .Where(x => x.BarberShopId == barberShopId && x.QueueDate == today)
            .MaxAsync(x => (int?)x.SequenceNumber, cancellationToken) ?? 0;

        var turn = new Turn(barberShopId, request.ServiceId, today, lastSequence + 1, request.CustomerName, request.BarberId);
        dbContext.Turns.Add(turn);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetTurnResponseAsync(barberShopId, turn.Id, cancellationToken)
            ?? throw new InvalidOperationException("The turn could not be loaded after creation.");
    }

    public Task<TurnResponse?> CallTurnAsync(Guid barberShopId, Guid turnId, Guid barberId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn =>
        {
            var barber = await dbContext.Barbers.SingleOrDefaultAsync(
                x => x.Id == barberId && x.BarberShopId == barberShopId && x.IsActive,
                cancellationToken);
            if (barber is null)
                throw new InvalidOperationException("The selected barber does not exist or is inactive.");
            if (barber.Status is BarberStatus.Break or BarberStatus.Offline)
                throw new InvalidOperationException("The selected barber is not available for service.");

            turn.Call(barberId);
            barber.ChangeStatus(BarberStatus.Busy);
        }, cancellationToken);

    public Task<TurnResponse?> StartTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, turn =>
        {
            turn.StartService();
            return Task.CompletedTask;
        }, cancellationToken);

    public Task<TurnResponse?> CompleteTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn =>
        {
            turn.Complete();
            if (turn.BarberId is Guid barberId)
            {
                var barber = await dbContext.Barbers.SingleAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken);
                barber.ChangeStatus(BarberStatus.Available);
            }
        }, cancellationToken);

    public Task<TurnResponse?> CancelTurnAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn =>
        {
            var releaseBarber = turn.Status == TurnStatus.Called && turn.BarberId is not null;
            turn.Cancel();
            if (releaseBarber && turn.BarberId is Guid barberId)
            {
                var barber = await dbContext.Barbers.SingleAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken);
                barber.ChangeStatus(BarberStatus.Available);
            }
        }, cancellationToken);

    public Task<TurnResponse?> MarkNoShowAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken = default) =>
        MutateTurnAsync(barberShopId, turnId, async turn =>
        {
            turn.MarkNoShow();
            if (turn.BarberId is Guid barberId)
            {
                var barber = await dbContext.Barbers.SingleAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken);
                barber.ChangeStatus(BarberStatus.Available);
            }
        }, cancellationToken);

    private async Task<TurnResponse?> MutateTurnAsync(
        Guid barberShopId,
        Guid turnId,
        Func<Turn, Task> mutation,
        CancellationToken cancellationToken)
    {
        var turn = await dbContext.Turns.SingleOrDefaultAsync(x => x.Id == turnId && x.BarberShopId == barberShopId, cancellationToken);
        if (turn is null)
            return null;

        await mutation(turn);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetTurnResponseAsync(barberShopId, turnId, cancellationToken);
    }

    private async Task<TurnResponse?> GetTurnResponseAsync(Guid barberShopId, Guid turnId, CancellationToken cancellationToken) =>
        await QueryTurns(barberShopId)
            .Where(x => x.Turn.Id == turnId)
            .Select(x => MapTurn(x.Turn, x.Service, x.Barber))
            .SingleOrDefaultAsync(cancellationToken);

    private IQueryable<TurnJoin> QueryTurns(Guid barberShopId) =>
        from turn in dbContext.Turns.AsNoTracking()
        join service in dbContext.BarberServices.AsNoTracking() on turn.ServiceId equals service.Id
        join barber in dbContext.Barbers.AsNoTracking() on turn.BarberId equals barber.Id into barberJoin
        from barber in barberJoin.DefaultIfEmpty()
        where turn.BarberShopId == barberShopId
        select new TurnJoin(turn, service, barber);

    private static TurnResponse MapTurn(Turn turn, BarberService service, Barber? barber) =>
        new(
            turn.Id,
            turn.TicketNumber,
            turn.CustomerName,
            turn.Status,
            service.Id,
            service.Name,
            barber?.Id,
            barber?.Name,
            barber?.ChairNumber,
            turn.CreatedAtUtc,
            turn.CalledAtUtc,
            turn.ServiceStartedAtUtc,
            turn.CompletedAtUtc);

    private sealed record TurnJoin(Turn Turn, BarberService Service, Barber? Barber);
}
