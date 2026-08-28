using System.Data;
using System.Data.Common;
using BarberTurn.Application.Appointments;
using BarberTurn.Application.Common;
using BarberTurn.Application.Queue;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BarberTurn.Infrastructure.Appointments;

internal sealed class AppointmentService(
    ApplicationDbContext dbContext,
    IQueueService queueService,
    IPlanLimitService planLimitService,
    IQueueNotifier queueNotifier) : IAppointmentService
{
    private static readonly TimeOnly BookingDayStartsAt = new(9, 0);
    private static readonly TimeOnly BookingDayEndsAt = new(19, 0);
    private static readonly TimeSpan BookingSlotInterval = TimeSpan.FromMinutes(30);

    public async Task<IReadOnlyList<AppointmentResponse>> GetAsync(Guid barberShopId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default)
    {
        var appointments = dbContext.Appointments.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.StartsAtUtc >= fromUtc && x.StartsAtUtc < toUtc)
            .OrderBy(x => x.StartsAtUtc);
        var rows = await Joined(appointments).ToListAsync(cancellationToken);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<AvailabilitySlotResponse>> GetAvailabilityAsync(string shopSlug, Guid serviceId, DateOnly localDate, Guid? barberId, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(shopSlug);
        var shop = await dbContext.BarberShops.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barbershop was not found.");
        var usage = await planLimitService.GetUsageAsync(shop.Id, cancellationToken);
        if (!usage.CanUseAppointments)
            throw new InvalidOperationException("Appointments require the Pro or Business plan.");
        var service = await dbContext.BarberServices.AsNoTracking().SingleOrDefaultAsync(x => x.Id == serviceId && x.BarberShopId == shop.Id && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The service was not found.");
        var barbers = await dbContext.Barbers.AsNoTracking().Where(x => x.BarberShopId == shop.Id && x.IsActive && (barberId == null || x.Id == barberId)).ToListAsync(cancellationToken);
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId);
        var localStart = localDate.ToDateTime(BookingDayStartsAt, DateTimeKind.Unspecified);
        var localEnd = localDate.ToDateTime(BookingDayEndsAt, DateTimeKind.Unspecified);
        var dayStartUtc = new DateTimeOffset(localStart, timeZone.GetUtcOffset(localStart)).ToUniversalTime();
        var dayEndUtc = new DateTimeOffset(localEnd, timeZone.GetUtcOffset(localEnd)).ToUniversalTime();
        var appointments = await dbContext.Appointments.AsNoTracking().Where(x => x.BarberShopId == shop.Id && x.StartsAtUtc < dayEndUtc && x.EndsAtUtc > dayStartUtc && x.Status != AppointmentStatus.Cancelled).ToListAsync(cancellationToken);
        var blocks = await dbContext.BlockedTimes.AsNoTracking().Where(x => x.BarberShopId == shop.Id && x.StartsAtUtc < dayEndUtc && x.EndsAtUtc > dayStartUtc).ToListAsync(cancellationToken);

        var slots = new List<AvailabilitySlotResponse>();
        foreach (var barber in barbers)
        {
            for (var starts = dayStartUtc; starts.AddMinutes(service.EstimatedDurationMinutes) <= dayEndUtc; starts = starts.Add(BookingSlotInterval))
            {
                var ends = starts.AddMinutes(service.EstimatedDurationMinutes);
                if (starts <= DateTimeOffset.UtcNow || appointments.Any(x => x.BarberId == barber.Id && Overlaps(starts, ends, x.StartsAtUtc, x.EndsAtUtc)) || blocks.Any(x => x.BarberId == barber.Id && Overlaps(starts, ends, x.StartsAtUtc, x.EndsAtUtc)))
                    continue;
                slots.Add(new AvailabilitySlotResponse(starts, ends, barber.Id, barber.Name));
            }
        }
        return slots.OrderBy(x => x.StartsAtUtc).ThenBy(x => x.BarberName).ToList();
    }

    public async Task<PublicAppointmentResponse> CreatePublicAsync(string shopSlug, CreateAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(shopSlug);
        var shop = await dbContext.BarberShops.SingleOrDefaultAsync(x => x.Slug == normalizedSlug && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barbershop was not found.");
        var usage = await planLimitService.GetUsageAsync(shop.Id, cancellationToken);
        if (!usage.CanUseAppointments)
            throw new InvalidOperationException("Appointments require the Pro or Business plan.");
        var service = await dbContext.BarberServices.SingleOrDefaultAsync(x => x.Id == request.ServiceId && x.BarberShopId == shop.Id && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The service was not found.");
        var start = request.StartsAt.ToUniversalTime();
        var end = start.AddMinutes(service.EstimatedDurationMinutes);
        ValidateAppointmentWindow(shop.TimeZoneId, start, end);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await AcquireBarberScheduleLockAsync(shop.Id, request.BarberId, cancellationToken);
        await EnsureAvailableAsync(shop.Id, request.BarberId, start, end, null, cancellationToken);

        var customer = await FindOrCreateCustomerAsync(shop.Id, request.CustomerName, request.CustomerPhone, request.CustomerEmail, cancellationToken);
        var raw = SecureToken.Create();
        var appointment = new Appointment(shop.Id, request.ServiceId, request.BarberId, start, end, request.CustomerName, request.CustomerPhone, request.CustomerEmail, SecureToken.Hash(raw), customer?.Id);
        dbContext.Appointments.Add(appointment);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await queueNotifier.QueueChangedAsync(shop.Id, "appointment-created", cancellationToken);
        return new PublicAppointmentResponse(await GetOneAsync(shop.Id, appointment.Id, cancellationToken) ?? throw new InvalidOperationException("Appointment could not be loaded."), raw);
    }

    public async Task<AppointmentResponse?> GetPublicAsync(string shopSlug, Guid appointmentId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(shopSlug);
        var shopId = await dbContext.BarberShops.AsNoTracking().Where(x => x.Slug == normalizedSlug).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
        if (shopId is null)
            return null;
        var hash = SecureToken.Hash(lookupToken);
        if (!await dbContext.Appointments.AnyAsync(x => x.Id == appointmentId && x.BarberShopId == shopId && x.PublicLookupTokenHash == hash, cancellationToken))
            return null;
        return await GetOneAsync(shopId.Value, appointmentId, cancellationToken);
    }

    public async Task<AppointmentResponse?> RescheduleAsync(Guid barberShopId, Guid appointmentId, RescheduleAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await AcquireBarberScheduleLockAsync(barberShopId, request.BarberId, cancellationToken);

        var appointment = await dbContext.Appointments.SingleOrDefaultAsync(x => x.Id == appointmentId && x.BarberShopId == barberShopId, cancellationToken);
        if (appointment is null)
            return null;
        var duration = await dbContext.BarberServices.Where(x => x.Id == appointment.ServiceId && x.BarberShopId == barberShopId).Select(x => x.EstimatedDurationMinutes).SingleAsync(cancellationToken);
        var timeZoneId = await dbContext.BarberShops.Where(x => x.Id == barberShopId).Select(x => x.TimeZoneId).SingleAsync(cancellationToken);
        var start = request.StartsAt.ToUniversalTime();
        var end = start.AddMinutes(duration);
        ValidateAppointmentWindow(timeZoneId, start, end);
        await EnsureAvailableAsync(barberShopId, request.BarberId, start, end, appointmentId, cancellationToken);
        appointment.Reschedule(start, end, request.BarberId);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new BusinessRuleException(ApplicationErrorCodes.AppointmentTimeUnavailable, "The appointment changed. Refresh and try again.");
        }

        await queueNotifier.QueueChangedAsync(barberShopId, "appointment-rescheduled", cancellationToken);
        return await GetOneAsync(barberShopId, appointmentId, cancellationToken);
    }

    public Task<AppointmentResponse?> CancelAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default) => MutateAsync(barberShopId, appointmentId, x => x.Cancel(), "appointment-cancelled", cancellationToken);
    public Task<AppointmentResponse?> MarkNoShowAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default) => MutateAsync(barberShopId, appointmentId, x => x.MarkNoShow(), "appointment-no-show", cancellationToken);
    public Task<AppointmentResponse?> CompleteAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default) => MutateAsync(barberShopId, appointmentId, x => x.Complete(), "appointment-completed", cancellationToken);

    public async Task<bool> CancelPublicAsync(string shopSlug, Guid appointmentId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = NormalizeSlug(shopSlug);
        var shopId = await dbContext.BarberShops.Where(x => x.Slug == normalizedSlug).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
        if (shopId is null)
            return false;
        var appointment = await dbContext.Appointments.SingleOrDefaultAsync(x => x.Id == appointmentId && x.BarberShopId == shopId && x.PublicLookupTokenHash == SecureToken.Hash(lookupToken), cancellationToken);
        if (appointment is null)
            return false;
        appointment.Cancel();
        await dbContext.SaveChangesAsync(cancellationToken);
        await queueNotifier.QueueChangedAsync(shopId.Value, "appointment-cancelled", cancellationToken);
        return true;
    }

    public async Task CreateBlockAsync(Guid barberShopId, CreateBlockedTimeRequest request, CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await AcquireBarberScheduleLockAsync(barberShopId, request.BarberId, cancellationToken);
        await EnsureAvailableAsync(barberShopId, request.BarberId, request.StartsAt.ToUniversalTime(), request.EndsAt.ToUniversalTime(), null, cancellationToken);
        dbContext.BlockedTimes.Add(new BlockedTime(barberShopId, request.BarberId, request.StartsAt.ToUniversalTime(), request.EndsAt.ToUniversalTime(), request.Reason));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<Guid?> CheckInAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default)
    {
        var appointment = await dbContext.Appointments.SingleOrDefaultAsync(x => x.Id == appointmentId && x.BarberShopId == barberShopId, cancellationToken);
        if (appointment is null)
            return null;
        appointment.CheckIn();
        await dbContext.SaveChangesAsync(cancellationToken);
        var turn = await queueService.CreateTurnAsync(barberShopId, new CreateTurnRequest(appointment.ServiceId, appointment.CustomerName, appointment.BarberId, appointment.CustomerPhone, $"appointment:{appointment.Id:N}", appointment.Id), cancellationToken);
        return turn.Id;
    }

    private async Task<AppointmentResponse?> MutateAsync(Guid shopId, Guid appointmentId, Action<Appointment> mutation, string eventName, CancellationToken ct)
    {
        var appointment = await dbContext.Appointments.SingleOrDefaultAsync(x => x.Id == appointmentId && x.BarberShopId == shopId, ct);
        if (appointment is null)
            return null;
        mutation(appointment);
        try { await dbContext.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new InvalidOperationException("The appointment changed. Refresh and try again."); }
        await queueNotifier.QueueChangedAsync(shopId, eventName, ct);
        return await GetOneAsync(shopId, appointmentId, ct);
    }

    private async Task EnsureAvailableAsync(Guid shopId, Guid barberId, DateTimeOffset start, DateTimeOffset end, Guid? excludedAppointmentId, CancellationToken ct)
    {
        var appointmentConflict = await dbContext.Appointments.AnyAsync(x => x.BarberShopId == shopId && x.BarberId == barberId && x.Id != excludedAppointmentId && x.Status != AppointmentStatus.Cancelled && x.StartsAtUtc < end && x.EndsAtUtc > start, ct);
        var blockConflict = await dbContext.BlockedTimes.AnyAsync(x => x.BarberShopId == shopId && x.BarberId == barberId && x.StartsAtUtc < end && x.EndsAtUtc > start, ct);
        if (appointmentConflict || blockConflict)
            throw new BusinessRuleException(ApplicationErrorCodes.AppointmentTimeUnavailable, "The selected time is no longer available.");
    }

    private async Task AcquireBarberScheduleLockAsync(Guid shopId, Guid barberId, CancellationToken ct)
    {
        var currentTransaction = dbContext.Database.CurrentTransaction
            ?? throw new InvalidOperationException("A database transaction is required to lock a barber schedule.");
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        await using var command = connection.CreateCommand();
        command.Transaction = currentTransaction.GetDbTransaction();
        command.CommandText = "SELECT [Id] FROM [Barbers] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = @barberId AND [BarberShopId] = @shopId AND [IsActive] = 1;";
        AddParameter(command, "@barberId", barberId, DbType.Guid);
        AddParameter(command, "@shopId", shopId, DbType.Guid);
        var lockedBarberId = await command.ExecuteScalarAsync(ct);
        if (lockedBarberId is null or DBNull)
            throw new InvalidOperationException("The barber was not found or is inactive.");
    }

    private static void AddParameter(DbCommand command, string name, object value, DbType dbType)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = dbType;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    private static void ValidateAppointmentWindow(string timeZoneId, DateTimeOffset startUtc, DateTimeOffset endUtc)
    {
        var now = DateTimeOffset.UtcNow;
        if (startUtc <= now || startUtc > now.AddMonths(6))
            throw new ArgumentException("The appointment must be in the future and within six months.");

        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        var localStart = TimeZoneInfo.ConvertTime(startUtc, timeZone);
        var localEnd = TimeZoneInfo.ConvertTime(endUtc, timeZone);
        var startsOnSlot = localStart.TimeOfDay.Ticks % BookingSlotInterval.Ticks == 0;
        var startsDuringDay = TimeOnly.FromDateTime(localStart.DateTime) >= BookingDayStartsAt;
        var endsDuringDay = TimeOnly.FromDateTime(localEnd.DateTime) <= BookingDayEndsAt;
        if (!startsOnSlot || localStart.Date != localEnd.Date || !startsDuringDay || !endsDuringDay)
            throw new ArgumentException("The selected time must match an available 30-minute slot between 09:00 and 19:00 local time.");
    }

    private async Task<Customer?> FindOrCreateCustomerAsync(Guid shopId, string name, string? phone, string? email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(phone) && string.IsNullOrWhiteSpace(email))
            return null;
        var normalizedEmail = email?.Trim().ToLowerInvariant();
        var normalizedPhone = phone?.Trim();
        var customer = await dbContext.Customers.SingleOrDefaultAsync(x => x.BarberShopId == shopId && ((normalizedPhone != null && x.Phone == normalizedPhone) || (normalizedEmail != null && x.Email == normalizedEmail)), ct);
        if (customer is not null)
            return customer;
        customer = new Customer(shopId, name, normalizedPhone, normalizedEmail);
        dbContext.Customers.Add(customer);
        return customer;
    }

    private async Task<AppointmentResponse?> GetOneAsync(Guid shopId, Guid id, CancellationToken ct)
    {
        var appointments = dbContext.Appointments.AsNoTracking()
            .Where(x => x.Id == id && x.BarberShopId == shopId);
        var row = await Joined(appointments).SingleOrDefaultAsync(ct);
        return row is null ? null : Map(row);
    }

    private IQueryable<AppointmentJoin> Joined(IQueryable<Appointment> appointments) =>
        from appointment in appointments
        join service in dbContext.BarberServices.AsNoTracking() on appointment.ServiceId equals service.Id
        join barber in dbContext.Barbers.AsNoTracking() on appointment.BarberId equals barber.Id
        select new AppointmentJoin(appointment, service, barber);

    private static AppointmentResponse Map(AppointmentJoin x) => new(x.Appointment.Id, x.Service.Id, x.Service.Name, x.Barber.Id, x.Barber.Name, x.Appointment.StartsAtUtc, x.Appointment.EndsAtUtc, x.Appointment.CustomerName, x.Appointment.CustomerPhone, x.Appointment.CustomerEmail, x.Appointment.Status);
    private static string NormalizeSlug(string slug) => slug.Trim().ToLowerInvariant();
    private static bool Overlaps(DateTimeOffset firstStart, DateTimeOffset firstEnd, DateTimeOffset secondStart, DateTimeOffset secondEnd) => firstStart < secondEnd && firstEnd > secondStart;
    private sealed record AppointmentJoin(Appointment Appointment, BarberService Service, Barber Barber);
}
