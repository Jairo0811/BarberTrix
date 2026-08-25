using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Commercial;

public sealed record CustomerResponse(Guid Id, string Name, string? Phone, string? Email, bool IsActive, DateTimeOffset CreatedAtUtc);
public sealed record UpsertCustomerRequest(string Name, string? Phone, string? Email);
public sealed record CreatePaymentRequest(decimal Amount, string Currency, PaymentMethod Method, Guid? TurnId, Guid? AppointmentId, Guid? CustomerId, string? ExternalReference);
public sealed record PaymentResponse(Guid Id, decimal Amount, string Currency, PaymentMethod Method, PaymentStatus Status, Guid? TurnId, Guid? AppointmentId, Guid? CustomerId, string? ExternalReference, DateTimeOffset? PaidAtUtc);
public sealed record BusinessReportResponse(DateOnly From, DateOnly To, int CompletedTurns, int CancelledTurns, int NoShows, int Appointments, decimal GrossRevenue, IReadOnlyDictionary<string, decimal> RevenueByMethod);

public interface ICommercialService
{
    Task<IReadOnlyList<CustomerResponse>> GetCustomersAsync(Guid barberShopId, string? search, int take, CancellationToken cancellationToken = default);
    Task<CustomerResponse> CreateCustomerAsync(Guid barberShopId, UpsertCustomerRequest request, CancellationToken cancellationToken = default);
    Task<CustomerResponse?> UpdateCustomerAsync(Guid barberShopId, Guid customerId, UpsertCustomerRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentResponse>> GetPaymentsAsync(Guid barberShopId, DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken cancellationToken = default);
    Task<PaymentResponse> CreatePaymentAsync(Guid barberShopId, CreatePaymentRequest request, CancellationToken cancellationToken = default);
    Task<BusinessReportResponse> GetReportAsync(Guid barberShopId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}

public sealed record CheckoutRequest(SubscriptionPlan Plan, string ReturnUrl, string CancelUrl);
public sealed record CheckoutResponse(string ProviderOrderId, string ApprovalUrl);
public sealed record CaptureCheckoutRequest(string ProviderOrderId);
public sealed record SubscriptionResponse(SubscriptionPlan Plan, SubscriptionStatus Status, string Provider, DateTimeOffset? PeriodEndsAtUtc, bool CancelAtPeriodEnd);

public interface IBillingService
{
    Task<CheckoutResponse> CreateCheckoutAsync(Guid barberShopId, CheckoutRequest request, CancellationToken cancellationToken = default);
    Task<SubscriptionResponse> CaptureCheckoutAsync(Guid barberShopId, CaptureCheckoutRequest request, CancellationToken cancellationToken = default);
    Task<SubscriptionResponse> GetSubscriptionAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<SubscriptionResponse> CancelAsync(Guid barberShopId, bool atPeriodEnd, CancellationToken cancellationToken = default);
    Task HandleWebhookAsync(string transmissionId, string transmissionTime, string certUrl, string authAlgo, string transmissionSignature, string webhookEventBody, CancellationToken cancellationToken = default);
}
