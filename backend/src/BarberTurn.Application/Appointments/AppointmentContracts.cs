using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Appointments;

public sealed record CreateAppointmentRequest(Guid ServiceId, Guid BarberId, DateTimeOffset StartsAt, string CustomerName, string? CustomerPhone, string? CustomerEmail);
public sealed record RescheduleAppointmentRequest(Guid BarberId, DateTimeOffset StartsAt);
public sealed record CreateBlockedTimeRequest(Guid BarberId, DateTimeOffset StartsAt, DateTimeOffset EndsAt, string Reason);
public sealed record AppointmentResponse(Guid Id, Guid ServiceId, string ServiceName, Guid BarberId, string BarberName, DateTimeOffset StartsAtUtc, DateTimeOffset EndsAtUtc, string CustomerName, string? CustomerPhone, string? CustomerEmail, AppointmentStatus Status);
public sealed record PublicAppointmentResponse(AppointmentResponse Appointment, string LookupToken);
public sealed record AvailabilitySlotResponse(DateTimeOffset StartsAtUtc, DateTimeOffset EndsAtUtc, Guid BarberId, string BarberName);

public interface IAppointmentService
{
    Task<IReadOnlyList<AppointmentResponse>> GetAsync(Guid barberShopId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AvailabilitySlotResponse>> GetAvailabilityAsync(string shopSlug, Guid serviceId, DateOnly localDate, Guid? barberId, CancellationToken cancellationToken = default);
    Task EnsureSlotAvailableAsync(Guid barberShopId, Guid serviceId, Guid barberId, DateTimeOffset startsAt, CancellationToken cancellationToken = default);
    Task<AppointmentResponse> CreateFromTurnRequestAsync(Guid barberShopId, Guid serviceId, Guid barberId, DateTimeOffset startsAt, string customerName, string? customerPhone, string? customerEmail, string publicLookupTokenHash, CancellationToken cancellationToken = default);
    Task<PublicAppointmentResponse> CreatePublicAsync(string shopSlug, CreateAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentResponse?> GetPublicAsync(string shopSlug, Guid appointmentId, string lookupToken, CancellationToken cancellationToken = default);
    Task<AppointmentResponse?> RescheduleAsync(Guid barberShopId, Guid appointmentId, RescheduleAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentResponse?> CancelAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default);
    Task<bool> CancelPublicAsync(string shopSlug, Guid appointmentId, string lookupToken, CancellationToken cancellationToken = default);
    Task<AppointmentResponse?> MarkNoShowAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default);
    Task<AppointmentResponse?> CompleteAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default);
    Task CreateBlockAsync(Guid barberShopId, CreateBlockedTimeRequest request, CancellationToken cancellationToken = default);
    Task<Guid?> CheckInAsync(Guid barberShopId, Guid appointmentId, CancellationToken cancellationToken = default);
}
