using BarberTurn.Application.Commercial;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Commercial;

internal sealed class CommercialService(ApplicationDbContext dbContext) : ICommercialService
{
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
            throw new ArgumentException("The from date must not be after the to date.");
        var completed = await dbContext.Turns.CountAsync(x => x.BarberShopId == barberShopId && x.QueueDate >= fromDate && x.QueueDate <= toDate && x.Status == TurnStatus.Completed, cancellationToken);
        var cancelled = await dbContext.Turns.CountAsync(x => x.BarberShopId == barberShopId && x.QueueDate >= fromDate && x.QueueDate <= toDate && x.Status == TurnStatus.Cancelled, cancellationToken);
        var noShows = await dbContext.Turns.CountAsync(x => x.BarberShopId == barberShopId && x.QueueDate >= fromDate && x.QueueDate <= toDate && x.Status == TurnStatus.NoShow, cancellationToken);
        var startUtc = new DateTimeOffset(fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var endUtc = new DateTimeOffset(toDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var appointments = await dbContext.Appointments.CountAsync(x => x.BarberShopId == barberShopId && x.StartsAtUtc >= startUtc && x.StartsAtUtc < endUtc && x.Status != AppointmentStatus.Cancelled, cancellationToken);
        var payments = await dbContext.Payments.AsNoTracking().Where(x => x.BarberShopId == barberShopId && x.PaidAtUtc >= startUtc && x.PaidAtUtc < endUtc && x.Status == PaymentStatus.Paid).ToListAsync(cancellationToken);
        var byMethod = payments.GroupBy(x => x.Method.ToString()).ToDictionary(x => x.Key, x => x.Sum(y => y.Amount));
        return new BusinessReportResponse(fromDate, toDate, completed, cancelled, noShows, appointments, payments.Sum(x => x.Amount), byMethod);
    }

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
}
