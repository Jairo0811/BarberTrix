using BarberTurn.Application.Appointments;
using BarberTurn.Application.Common;
using BarberTurn.Application.Queue;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Appointments;

internal sealed class AppointmentService(
    ApplicationDbContext dbContext,
    IQueueService queueService,
    IPlanLimitService planLimitService,
    IQueueNotifier queueNotifier) : IAppointmentService
{
    public async Task<IReadOnlyList<AppointmentResponse>> GetAsync(Guid barberShopId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default)
    {
        var rows = await Joined().Where(x => x.Appointment.BarberShopId == barberShopId && x.Appointment.StartsAtUtc >= fromUtc && x.Appointment.StartsAtUtc < toUtc)
            .OrderBy(x => x.Appointment.StartsAtUtc).ToListAsync(cancellationToken);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<AvailabilitySlotResponse>> GetAvailabilityAsync(string shopSlug, Guid serviceId, DateOnly date, Guid? barberId, CancellationToken cancellationToken = default)
    {
        var shop = await dbContext.BarberShops.AsNoTracking().SingleOrDefaultAsync(x => x.Slug == shopSlug.ToLower() && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barbershop was not found.");
        var usage = await planLimitService.GetUsageAsync(shop.Id, cancellationToken);
        if (!usage.CanUseAppointments)
            throw new InvalidOperationException("Appointments require the Pro or Business plan.");
        var service = await dbContext.BarberServices.AsNoTracking().SingleOrDefaultAsync(x => x.Id == serviceId && x.BarberShopId == shop.Id && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The service was not found.");
        var barbers = await dbContext.Barbers.AsNoTracking().Where(x => x.BarberShopId == shop.Id && x.IsActive && (barberId == null || x.Id == barberId)).ToListAsync(cancellationToken);
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZoneId);
        var localStart = date.ToDateTime(new TimeOnly(9, 0), DateTimeKind.Unspecified);
        var localEnd = date.ToDateTime(new TimeOnly(19, 0), DateTimeKind.Unspecified);
        var dayStartUtc = new DateTimeOffset(localStart, timeZone.GetUtcOffset(localStart)).ToUniversalTime();
        var dayEndUtc = new DateTimeOffset(localEnd, timeZone.GetUtcOffset(localEnd)).ToUniversalTime();
        var appointments = await dbContext.Appointments.AsNoTracking().Where(x => x.BarberShopId == shop.Id && x.StartsAtUtc < dayEndUtc && x.EndsAtUtc > dayStartUtc && x.Status != AppointmentStatus.Cancelled).ToListAsync(cancellationToken);
        var blocks = await dbContext.BlockedTimes.AsNoTracking().Where(x => x.BarberShopId == shop.Id && x.StartsAtUtc < dayEndUtc && x.EndsAtUtc > dayStartUtc).ToListAsync(cancellationToken);

        var slots = new List<AvailabilitySlotResponse>();
        foreach (var barber in barbers)
        {
            for (var starts = dayStartUtc; starts.AddMinutes(service.EstimatedDurationMinutes) <= dayEndUtc; starts = starts.AddMinutes(30))
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
        var shop = await dbContext.BarberShops.SingleOrDefaultAsync(x => x.Slug == shopSlug.ToLower() && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barbershop was not found.");
        var usage = await planLimitService.GetUsageAsync(shop.Id, cancellationToken);
        if (!usage.CanUseAppointments)
            throw new InvalidOperationException("Appointments require the Pro or Business plan.");
        var service = await dbContext.BarberServices.SingleOrDefaultAsync(x => x.Id == request.ServiceId && x.BarberShopId == shop.Id && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The service was not found.");
        if (!await dbContext.Barbers.AnyAsync(x => x.Id == request.BarberId && x.BarberShopId == shop.Id && x.IsActive, cancellationToken))
            throw new InvalidOperationException("The barber was not found.");
        var start = request.StartsAt.ToUniversalTime();
        var end = start.AddMinutes(service.EstimatedDurationMinutes);
        if (start <= DateTimeOffset.UtcNow || start > DateTimeOffset.UtcNow.AddMonths(6))
            throw new InvalidOperationException("The appointment must be in the future and within six months.");
        await EnsureAvailableAsync(shop.Id, request.BarberId, start, end, null, cancellationToken);

        var customer = await FindOrCreateCustomerAsync(shop.Id, request.CustomerName, request.CustomerPhone, request.CustomerEmail, cancellationToken);
        var raw = SecureToken.Create();
        var appointment = new Appointment(shop.Id, request.ServiceId, request.BarberId, start, end, request.CustomerName, request.CustomerPhone, request.CustomerEmail, SecureToken.Hash(raw), customer?.Id);
        dbContext.Appointments.Add(appointment);
        await dbContext.SaveChangesAsync(cancellationToken);
        await queueNotifier.QueueChangedAsync(shop.Id, "appointment-created", cancellationToken);
        return new PublicAppointmentResponse(await GetOneAsync(shop.Id, appointment.Id, cancellationToken) ?? throw new InvalidOperationException("Appointment could not be loaded."), raw);
    }

    public async Task<AppointmentResponse?> GetPublicAsync(string shopSlug, Guid appointmentId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var shopId = await dbContext.BarberShops.AsNoTracking().Where(x => x.Slug == shopSlug.ToLower()).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
        if (shopId is null)
            return null;
        var hash = SecureToken.Hash(lookupToken);
        if (!await dbContext.Appointments.AnyAsync(x => x.Id == appointmentId && x.BarberShopId == shopId && x.PublicLookupTokenHash == hash, cancellationToken))
            return null;
        return await GetOneAsync(shopId.Value, appointmentId, cancellationToken);
    }

    public async Task<AppointmentResponse?> RescheduleAsync(Guid barberShopId, Guid appointmentId, RescheduleAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var appointment = await dbContext.Appointments.SingleOrDefaultAsync(x => x.Id == appointmentId && x.BarberShopId == barberShopId, cancellationToken);
        if (appointment is null)
            return null;
        var duration = await dbContext.BarberServices.Where(x => x.Id == appointment.ServiceId && x.BarberShopId == barberShopId).Select(x => x.EstimatedDurationMinutes).SingleAsync(cancellationToken);
        var start = request.StartsAt.ToUniversalTime();
        var end = start.AddMinutes(duration);
        await EnsureAvailableAsync(barberShopId, request.BarberId, start, end, appointmentId, cancellationToken);
        appointment.Reschedule(start, end, request.BarberId);
        await dbContext.SaveChangesAsync(cancellationToken);
        await queueNotifier.QueueChangedAsync(barberShopId, "appointment-rescheduled", cancellationToken);
        return await GetOneAsync(barberShopId, appointmentId, cancellationToken);
    }

    public Task<AppointmentResponse?> CancelAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default) => MutateAsync(barberShopId, appointmentId, x => x.Cancel(), "appointment-cancelled", cancellationToken);
    public Task<AppointmentResponse?> MarkNoShowAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default) => MutateAsync(barberShopId, appointmentId, x => x.MarkNoShow(), "appointment-no-show", cancellationToken);
    public Task<AppointmentResponse?> CompleteAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default) => MutateAsync(barberShopId, appointmentId, x => x.Complete(), "appointment-completed", cancellationToken);

    public async Task<bool> CancelPublicAsync(string shopSlug, Guid appointmentId, string lookupToken, CancellationToken cancellationToken = default)
    {
        var shopId = await dbContext.BarberShops.Where(x => x.Slug == shopSlug.ToLower()).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(cancellationToken);
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
        if (!await dbContext.Barbers.AnyAsync(x => x.Id == request.BarberId && x.BarberShopId == barberShopId, cancellationToken))
            throw new InvalidOperationException("The barber was not found.");
        dbContext.BlockedTimes.Add(new BlockedTime(barberShopId, request.BarberId, request.StartsAt.ToUniversalTime(), request.EndsAt.ToUniversalTime(), request.Reason));
        await dbContext.SaveChangesAsync(cancellationToken);
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
            throw new InvalidOperationException("The selected time is no longer available.");
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
        var row = await Joined().SingleOrDefaultAsync(x => x.Appointment.Id == id && x.Appointment.BarberShopId == shopId, ct);
        return row is null ? null : Map(row);
    }

    private IQueryable<AppointmentJoin> Joined() =>
        from appointment in dbContext.Appointments.AsNoTracking()
        join service in dbContext.BarberServices.AsNoTracking() on appointment.ServiceId equals service.Id
        join barber in dbContext.Barbers.AsNoTracking() on appointment.BarberId equals barber.Id
        select new AppointmentJoin(appointment, service, barber);

    private static AppointmentResponse Map(AppointmentJoin x) => new(x.Appointment.Id, x.Service.Id, x.Service.Name, x.Barber.Id, x.Barber.Name, x.Appointment.StartsAtUtc, x.Appointment.EndsAtUtc, x.Appointment.CustomerName, x.Appointment.CustomerPhone, x.Appointment.CustomerEmail, x.Appointment.Status);
    private static bool Overlaps(DateTimeOffset firstStart, DateTimeOffset firstEnd, DateTimeOffset secondStart, DateTimeOffset secondEnd) => firstStart < secondEnd && firstEnd > secondStart;
    private sealed record AppointmentJoin(Appointment Appointment, BarberService Service, Barber Barber);
}
