using BarberTurn.Application.Commercial;
using BarberTurn.Application.Common;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Commercial;

internal sealed class CommercialService(ApplicationDbContext dbContext) : ICommercialService
{
    private const string CustomerNoteAction = "CustomerNoteUpdated";
    private const string CustomerResourceType = "Customer";

    public async Task<ShopSettingsResponse> GetShopSettingsAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.BarberShops.AsNoTracking()
            .Where(x => x.Id == barberShopId)
            .Select(x => new ShopSettingsResponse(x.Id, x.Name, x.Slug, x.TimeZoneId, x.Plan, x.SubscriptionStatus, x.TrialEndsAtUtc))
            .SingleAsync(cancellationToken);

    public async Task UpdateShopSettingsAsync(Guid barberShopId, UpdateShopSettingsRequest request, CancellationToken cancellationToken = default)
    {
        _ = TimeZoneInfo.FindSystemTimeZoneById(request.TimeZoneId);
        var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == barberShopId, cancellationToken);
        shop.UpdateSettings(request.Name, request.TimeZoneId);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ShopLocationResponse>> GetLocationsAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await dbContext.ShopLocations.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .OrderBy(x => x.Name)
            .Select(MapLocation())
            .ToListAsync(cancellationToken);

    public async Task<ShopLocationResponse> CreateLocationAsync(Guid barberShopId, UpsertLocationRequest request, CancellationToken cancellationToken = default)
    {
        var location = new ShopLocation(barberShopId, request.Name, request.Slug, request.Address, request.TimeZoneId);
        dbContext.ShopLocations.Add(location);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(location);
    }

    public async Task<ShopLocationResponse?> UpdateLocationAsync(Guid barberShopId, Guid locationId, UpsertLocationRequest request, CancellationToken cancellationToken = default)
    {
        var location = await dbContext.ShopLocations.SingleOrDefaultAsync(x => x.Id == locationId && x.BarberShopId == barberShopId, cancellationToken);
        if (location is null)
            return null;
        location.Update(request.Name, request.Slug, request.Address, request.TimeZoneId);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(location);
    }

    public async Task<IReadOnlyList<CustomerResponse>> GetCustomersAsync(Guid barberShopId, string? search, int take, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Customers.AsNoTracking().Where(x => x.BarberShopId == barberShopId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.Name.Contains(term) || (x.Phone != null && x.Phone.Contains(term)) || (x.Email != null && x.Email.Contains(term)));
        }
        return await query.OrderBy(x => x.Name).Take(Math.Clamp(take, 1, 500)).Select(MapCustomer()).ToListAsync(cancellationToken);
    }

    public async Task<CustomerDetailResponse?> GetCustomerDetailAsync(Guid barberShopId, Guid customerId, CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers.AsNoTracking()
            .Where(x => x.Id == customerId && x.BarberShopId == barberShopId)
            .Select(MapCustomer())
            .SingleOrDefaultAsync(cancellationToken);
        if (customer is null)
            return null;

        var resourceId = customerId.ToString("D");
        var notes = await dbContext.AuditLogs.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.Action == CustomerNoteAction && x.ResourceType == CustomerResourceType && x.ResourceId == resourceId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => x.Metadata)
            .FirstOrDefaultAsync(cancellationToken);

        var completedAppointments = dbContext.Appointments.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.CustomerId == customerId && x.Status == AppointmentStatus.Completed);
        var completedVisits = await completedAppointments.CountAsync(cancellationToken);
        var lastVisitAtUtc = await completedAppointments.Select(x => (DateTimeOffset?)x.EndsAtUtc).MaxAsync(cancellationToken);

        var spendRows = await dbContext.Payments.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.CustomerId == customerId && x.Status == PaymentStatus.Paid)
            .GroupBy(x => x.Currency)
            .Select(group => new { Currency = group.Key, Amount = group.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);
        var lifetimeSpendByCurrency = spendRows.ToDictionary(x => x.Currency, x => x.Amount, StringComparer.OrdinalIgnoreCase);

        var recentAppointments = await (
            from appointment in dbContext.Appointments.AsNoTracking()
            join service in dbContext.BarberServices.AsNoTracking() on appointment.ServiceId equals service.Id
            join barber in dbContext.Barbers.AsNoTracking() on appointment.BarberId equals barber.Id
            where appointment.BarberShopId == barberShopId && appointment.CustomerId == customerId
            orderby appointment.StartsAtUtc descending
            select new CustomerAppointmentResponse(appointment.Id, appointment.StartsAtUtc, appointment.EndsAtUtc, service.Name, barber.Name, appointment.Status))
            .Take(12)
            .ToListAsync(cancellationToken);

        return new CustomerDetailResponse(customer, notes, completedVisits, lastVisitAtUtc, lifetimeSpendByCurrency, recentAppointments);
    }

    public async Task<CustomerResponse> CreateCustomerAsync(Guid barberShopId, UpsertCustomerRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureUniqueAsync(barberShopId, null, request.Phone, request.Email, cancellationToken);
        var customer = new Customer(barberShopId, request.Name, request.Phone, request.Email);
        dbContext.Customers.Add(customer);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(customer);
    }

    public async Task<CustomerResponse?> UpdateCustomerAsync(Guid barberShopId, Guid customerId, UpsertCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var customer = await dbContext.Customers.SingleOrDefaultAsync(x => x.Id == customerId && x.BarberShopId == barberShopId, cancellationToken);
        if (customer is null)
            return null;
        await EnsureUniqueAsync(barberShopId, customerId, request.Phone, request.Email, cancellationToken);
        customer.Update(request.Name, request.Phone, request.Email);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(customer);
    }

    public async Task<bool> UpdateCustomerNoteAsync(Guid barberShopId, Guid customerId, Guid? userId, string? notes, CancellationToken cancellationToken = default)
    {
        if (!await dbContext.Customers.AnyAsync(x => x.Id == customerId && x.BarberShopId == barberShopId, cancellationToken))
            return false;

        var normalizedNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        if (normalizedNotes?.Length > 1000)
            throw new ArgumentException("Customer notes cannot exceed 1000 characters.", nameof(notes));

        dbContext.AuditLogs.Add(new AuditLog(barberShopId, userId, CustomerNoteAction, CustomerResourceType, customerId.ToString("D"), normalizedNotes, null));
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<PaymentResponse>> GetPaymentsAsync(Guid barberShopId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default) =>
        await dbContext.Payments.AsNoTracking().Where(x => x.BarberShopId == barberShopId && x.CreatedAtUtc >= fromUtc && x.CreatedAtUtc < toUtc)
            .OrderByDescending(x => x.CreatedAtUtc).Select(MapPayment()).ToListAsync(cancellationToken);

    public async Task<PaymentResponse> CreatePaymentAsync(Guid barberShopId, CreatePaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (request.TurnId is Guid turnId && !await dbContext.Turns.AnyAsync(x => x.Id == turnId && x.BarberShopId == barberShopId, cancellationToken))
            throw new InvalidOperationException("The turn does not belong to this barbershop.");
        if (request.AppointmentId is Guid appointmentId && !await dbContext.Appointments.AnyAsync(x => x.Id == appointmentId && x.BarberShopId == barberShopId, cancellationToken))
            throw new InvalidOperationException("The appointment does not belong to this barbershop.");
        if (request.CustomerId is Guid customerId && !await dbContext.Customers.AnyAsync(x => x.Id == customerId && x.BarberShopId == barberShopId, cancellationToken))
            throw new InvalidOperationException("The customer does not belong to this barbershop.");
        var payment = new PaymentRecord(barberShopId, request.Amount, request.Currency, request.Method, request.TurnId, request.AppointmentId, request.CustomerId, request.ExternalReference);
        dbContext.Payments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(payment);
    }

    public async Task<BusinessReportResponse> GetReportAsync(Guid barberShopId, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
    {
        if (fromDate > toDate)
            throw new ArgumentException("The from date must not be after the to date.", nameof(fromDate));
        if (toDate.DayNumber - fromDate.DayNumber > 365)
            throw new ArgumentOutOfRangeException(nameof(toDate), "Business reports are limited to 366 days per request.");

        var timeZoneId = await dbContext.BarberShops.AsNoTracking()
            .Where(x => x.Id == barberShopId)
            .Select(x => x.TimeZoneId)
            .SingleAsync(cancellationToken);
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);

        var current = await LoadReportPeriodAsync(barberShopId, fromDate, toDate, timeZone, cancellationToken);
        var days = toDate.DayNumber - fromDate.DayNumber + 1;
        var previousTo = fromDate.AddDays(-1);
        var previousFrom = previousTo.AddDays(-(days - 1));
        var previous = await LoadReportPeriodAsync(barberShopId, previousFrom, previousTo, timeZone, cancellationToken);

        var barberNames = await dbContext.Barbers.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
        var serviceNames = await dbContext.BarberServices.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId)
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);

        var turnById = current.Turns.ToDictionary(x => x.Id);
        var appointmentById = current.Appointments.ToDictionary(x => x.Id);
        var revenueByBarber = new Dictionary<Guid, Dictionary<string, decimal>>();
        var revenueByService = new Dictionary<Guid, Dictionary<string, decimal>>();
        foreach (var payment in current.Payments)
        {
            Guid? barberId = null;
            Guid? serviceId = null;
            if (payment.TurnId is Guid turnId && turnById.TryGetValue(turnId, out var turn))
            {
                barberId = turn.BarberId;
                serviceId = turn.ServiceId;
            }
            else if (payment.AppointmentId is Guid appointmentId && appointmentById.TryGetValue(appointmentId, out var appointment))
            {
                barberId = appointment.BarberId;
                serviceId = appointment.ServiceId;
            }

            if (barberId is Guid resolvedBarberId)
                AddMoney(revenueByBarber, resolvedBarberId, payment.Currency, payment.Amount);
            if (serviceId is Guid resolvedServiceId)
                AddMoney(revenueByService, resolvedServiceId, payment.Currency, payment.Amount);
        }

        var representedAppointments = current.Turns.Where(x => x.AppointmentId.HasValue).Select(x => x.AppointmentId!.Value).ToHashSet();
        var completedTurns = current.Turns.Where(x => x.Status == TurnStatus.Completed).ToList();
        var directCompletedAppointments = current.Appointments.Where(x => x.Status == AppointmentStatus.Completed && !representedAppointments.Contains(x.Id)).ToList();

        var serviceMinutesByBarber = new Dictionary<Guid, decimal>();
        var completedByBarber = new Dictionary<Guid, int>();
        var completedByService = new Dictionary<Guid, int>();
        var peakHours = new Dictionary<int, int>();

        foreach (var turn in completedTurns)
        {
            if (turn.BarberId is Guid barberId)
            {
                completedByBarber[barberId] = completedByBarber.GetValueOrDefault(barberId) + 1;
                if (turn.ServiceStartedAtUtc is { } started && turn.CompletedAtUtc is { } completed && completed > started)
                    serviceMinutesByBarber[barberId] = serviceMinutesByBarber.GetValueOrDefault(barberId) + (decimal)(completed - started).TotalMinutes;
            }
            completedByService[turn.ServiceId] = completedByService.GetValueOrDefault(turn.ServiceId) + 1;
            if (turn.CompletedAtUtc is { } completedAt)
            {
                var hour = TimeZoneInfo.ConvertTime(completedAt, timeZone).Hour;
                peakHours[hour] = peakHours.GetValueOrDefault(hour) + 1;
            }
        }

        foreach (var appointment in directCompletedAppointments)
        {
            completedByBarber[appointment.BarberId] = completedByBarber.GetValueOrDefault(appointment.BarberId) + 1;
            serviceMinutesByBarber[appointment.BarberId] = serviceMinutesByBarber.GetValueOrDefault(appointment.BarberId) + (decimal)(appointment.EndsAtUtc - appointment.StartsAtUtc).TotalMinutes;
            completedByService[appointment.ServiceId] = completedByService.GetValueOrDefault(appointment.ServiceId) + 1;
            var hour = TimeZoneInfo.ConvertTime(appointment.StartsAtUtc, timeZone).Hour;
            peakHours[hour] = peakHours.GetValueOrDefault(hour) + 1;
        }

        var totalServiceMinutes = serviceMinutesByBarber.Values.Sum();
        var barberIds = completedByBarber.Keys.Union(revenueByBarber.Keys).Distinct().ToList();
        var barberBreakdown = barberIds
            .Select(id => new ReportBarberBreakdown(
                id,
                barberNames.GetValueOrDefault(id, "Barbero"),
                completedByBarber.GetValueOrDefault(id),
                Math.Round(serviceMinutesByBarber.GetValueOrDefault(id), 1),
                totalServiceMinutes <= 0 ? 0 : Math.Round(serviceMinutesByBarber.GetValueOrDefault(id) / totalServiceMinutes * 100m, 1),
                revenueByBarber.TryGetValue(id, out var revenue) ? revenue : EmptyMoney()))
            .OrderByDescending(x => x.CompletedServices)
            .ThenBy(x => x.BarberName)
            .ToList();

        var serviceIds = completedByService.Keys.Union(revenueByService.Keys).Distinct().ToList();
        var serviceBreakdown = serviceIds
            .Select(id => new ReportServiceBreakdown(
                id,
                serviceNames.GetValueOrDefault(id, "Servicio"),
                completedByService.GetValueOrDefault(id),
                revenueByService.TryGetValue(id, out var revenue) ? revenue : EmptyMoney()))
            .OrderByDescending(x => x.CompletedServices)
            .ThenBy(x => x.ServiceName)
            .ToList();

        var methodBreakdown = current.Payments
            .GroupBy(x => x.Method)
            .Select(group => new ReportMoneyBreakdown(
                group.Key.ToString(),
                group.Key.ToString(),
                MoneyByCurrency(group),
                group.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        return new BusinessReportResponse(
            fromDate,
            toDate,
            current.CompletedTurns,
            current.CancelledTurns,
            current.NoShows,
            current.Appointments.Count(x => x.Status != AppointmentStatus.Cancelled),
            current.NoShowRatePercent,
            current.RevenueByCurrency,
            current.AverageTicketByCurrency,
            methodBreakdown,
            barberBreakdown,
            serviceBreakdown,
            peakHours.OrderByDescending(x => x.Value).ThenBy(x => x.Key).Select(x => new ReportHourBreakdown(x.Key, x.Value)).ToList(),
            new ReportPeriodComparison(
                previousFrom,
                previousTo,
                previous.CompletedTurns,
                previous.Appointments.Count(x => x.Status != AppointmentStatus.Cancelled),
                previous.NoShows,
                previous.NoShowRatePercent,
                previous.RevenueByCurrency,
                previous.AverageTicketByCurrency));
    }

    private async Task<ReportPeriodData> LoadReportPeriodAsync(Guid barberShopId, DateOnly fromDate, DateOnly toDate, TimeZoneInfo timeZone, CancellationToken ct)
    {
        var (startUtc, endUtc) = ToUtcRange(fromDate, toDate, timeZone);
        var turns = await dbContext.Turns.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.QueueDate >= fromDate && x.QueueDate <= toDate)
            .Select(x => new ReportTurnRow(x.Id, x.ServiceId, x.BarberId, x.AppointmentId, x.Status, x.ServiceStartedAtUtc, x.CompletedAtUtc))
            .ToListAsync(ct);
        var appointments = await dbContext.Appointments.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.StartsAtUtc >= startUtc && x.StartsAtUtc < endUtc)
            .Select(x => new ReportAppointmentRow(x.Id, x.ServiceId, x.BarberId, x.StartsAtUtc, x.EndsAtUtc, x.Status))
            .ToListAsync(ct);
        var payments = await dbContext.Payments.AsNoTracking()
            .Where(x => x.BarberShopId == barberShopId && x.PaidAtUtc >= startUtc && x.PaidAtUtc < endUtc && x.Status == PaymentStatus.Paid)
            .Select(x => new ReportPaymentRow(x.Amount, x.Currency, x.Method, x.TurnId, x.AppointmentId))
            .ToListAsync(ct);

        var representedAppointments = turns.Where(x => x.AppointmentId.HasValue).Select(x => x.AppointmentId!.Value).ToHashSet();
        var turnNoShows = turns.Count(x => x.Status == TurnStatus.NoShow);
        var directAppointmentNoShows = appointments.Count(x => x.Status == AppointmentStatus.NoShow && !representedAppointments.Contains(x.Id));
        var noShows = turnNoShows + directAppointmentNoShows;
        var completed = turns.Count(x => x.Status == TurnStatus.Completed);
        var directAppointmentCompleted = appointments.Count(x => x.Status == AppointmentStatus.Completed && !representedAppointments.Contains(x.Id));
        var completedServices = completed + directAppointmentCompleted;
        var opportunityCount = completedServices + noShows;

        return new ReportPeriodData(
            turns,
            appointments,
            payments,
            completed,
            turns.Count(x => x.Status == TurnStatus.Cancelled),
            noShows,
            opportunityCount == 0 ? 0 : Math.Round(noShows * 100m / opportunityCount, 1),
            MoneyByCurrency(payments),
            AverageTicketByCurrency(payments));
    }

    private static (DateTimeOffset StartUtc, DateTimeOffset EndUtc) ToUtcRange(DateOnly from, DateOnly to, TimeZoneInfo timeZone)
    {
        var localStart = DateTime.SpecifyKind(from.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var localEnd = DateTime.SpecifyKind(to.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return (new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localStart, timeZone)), new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localEnd, timeZone)));
    }

    private static IReadOnlyDictionary<string, decimal> MoneyByCurrency(IEnumerable<ReportPaymentRow> payments) =>
        payments.GroupBy(x => x.Currency.ToUpperInvariant()).ToDictionary(x => x.Key, x => x.Sum(y => y.Amount), StringComparer.OrdinalIgnoreCase);

    private static IReadOnlyDictionary<string, decimal> AverageTicketByCurrency(IEnumerable<ReportPaymentRow> payments) =>
        payments.GroupBy(x => x.Currency.ToUpperInvariant()).ToDictionary(x => x.Key, x => Math.Round(x.Average(y => y.Amount), 2), StringComparer.OrdinalIgnoreCase);

    private static void AddMoney(Dictionary<Guid, Dictionary<string, decimal>> target, Guid id, string currency, decimal amount)
    {
        if (!target.TryGetValue(id, out var values))
        {
            values = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            target[id] = values;
        }
        var key = currency.ToUpperInvariant();
        values[key] = values.GetValueOrDefault(key) + amount;
    }

    private static IReadOnlyDictionary<string, decimal> EmptyMoney() => new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

    private async Task EnsureUniqueAsync(Guid shopId, Guid? excludedId, string? phone, string? email, CancellationToken ct)
    {
        var normalizedPhone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
        if (normalizedPhone is not null && await dbContext.Customers.AnyAsync(x => x.BarberShopId == shopId && x.Id != excludedId && x.Phone == normalizedPhone, ct))
            throw new BusinessRuleException(ApplicationErrorCodes.CustomerAlreadyExists, "A customer with that phone already exists.");
        if (normalizedEmail is not null && await dbContext.Customers.AnyAsync(x => x.BarberShopId == shopId && x.Id != excludedId && x.Email == normalizedEmail, ct))
            throw new BusinessRuleException(ApplicationErrorCodes.CustomerAlreadyExists, "A customer with that email already exists.");
    }

    private static System.Linq.Expressions.Expression<Func<ShopLocation, ShopLocationResponse>> MapLocation() => x =>
        new ShopLocationResponse(x.Id, x.BarberShopId, x.Name, x.Slug, x.Address, x.TimeZoneId, x.IsActive);
    private static ShopLocationResponse ToResponse(ShopLocation x) => new(x.Id, x.BarberShopId, x.Name, x.Slug, x.Address, x.TimeZoneId, x.IsActive);
    private static System.Linq.Expressions.Expression<Func<Customer, CustomerResponse>> MapCustomer() => x => new CustomerResponse(x.Id, x.Name, x.Phone, x.Email, x.IsActive, x.CreatedAtUtc);
    private static CustomerResponse ToResponse(Customer x) => new(x.Id, x.Name, x.Phone, x.Email, x.IsActive, x.CreatedAtUtc);
    private static System.Linq.Expressions.Expression<Func<PaymentRecord, PaymentResponse>> MapPayment() => x => new PaymentResponse(x.Id, x.Amount, x.Currency, x.Method, x.Status, x.TurnId, x.AppointmentId, x.CustomerId, x.ExternalReference, x.PaidAtUtc);
    private static PaymentResponse ToResponse(PaymentRecord x) => new(x.Id, x.Amount, x.Currency, x.Method, x.Status, x.TurnId, x.AppointmentId, x.CustomerId, x.ExternalReference, x.PaidAtUtc);

    private sealed record ReportTurnRow(Guid Id, Guid ServiceId, Guid? BarberId, Guid? AppointmentId, TurnStatus Status, DateTimeOffset? ServiceStartedAtUtc, DateTimeOffset? CompletedAtUtc);
    private sealed record ReportAppointmentRow(Guid Id, Guid ServiceId, Guid BarberId, DateTimeOffset StartsAtUtc, DateTimeOffset EndsAtUtc, AppointmentStatus Status);
    private sealed record ReportPaymentRow(decimal Amount, string Currency, PaymentMethod Method, Guid? TurnId, Guid? AppointmentId);
    private sealed record ReportPeriodData(
        IReadOnlyList<ReportTurnRow> Turns,
        IReadOnlyList<ReportAppointmentRow> Appointments,
        IReadOnlyList<ReportPaymentRow> Payments,
        int CompletedTurns,
        int CancelledTurns,
        int NoShows,
        decimal NoShowRatePercent,
        IReadOnlyDictionary<string, decimal> RevenueByCurrency,
        IReadOnlyDictionary<string, decimal> AverageTicketByCurrency);
}
