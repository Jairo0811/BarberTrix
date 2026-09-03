using System.Data;
using System.Data.Common;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BarberTrix.Application.Commercial;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BarberTrix.Infrastructure.Commercial;

internal sealed class PayPalBillingService(
    HttpClient httpClient,
    ApplicationDbContext dbContext,
    IConfiguration configuration,
    ILogger<PayPalBillingService> logger) : IBillingService
{
    private static readonly Action<ILogger, Guid, SubscriptionPlan, Exception?> LogCreatingCheckout =
        LoggerMessage.Define<Guid, SubscriptionPlan>(
            LogLevel.Information,
            new EventId(1001, nameof(CreateCheckoutAsync)),
            "Creating PayPal checkout for tenant {TenantId} and plan {Plan}");

    private static readonly Action<ILogger, Guid, SubscriptionPlan, Exception?> LogSubscriptionActivated =
        LoggerMessage.Define<Guid, SubscriptionPlan>(
            LogLevel.Information,
            new EventId(1002, nameof(CaptureCheckoutAsync)),
            "Activated PayPal subscription for tenant {TenantId} on plan {Plan}");

    private static readonly Action<ILogger, Guid, bool, Exception?> LogSubscriptionCancelled =
        LoggerMessage.Define<Guid, bool>(
            LogLevel.Information,
            new EventId(1003, nameof(CancelAsync)),
            "Cancelled PayPal subscription for tenant {TenantId}; at period end: {AtPeriodEnd}");

    private static readonly Action<ILogger, Exception?> LogWebhookSignatureRejected =
        LoggerMessage.Define(
            LogLevel.Warning,
            new EventId(1101, "PayPalWebhookSignatureRejected"),
            "Rejected PayPal webhook because signature verification failed");

    private static readonly Action<ILogger, string, Exception?> LogWebhookMissingProviderId =
        LoggerMessage.Define<string>(
            LogLevel.Warning,
            new EventId(1102, "PayPalWebhookMissingProviderId"),
            "Ignoring PayPal webhook {EventType} without a provider resource id");

    private static readonly Action<ILogger, string, Exception?> LogWebhookSubscriptionNotFound =
        LoggerMessage.Define<string>(
            LogLevel.Warning,
            new EventId(1103, "PayPalWebhookSubscriptionNotFound"),
            "Ignoring PayPal webhook {EventType} because no local subscription matched");

    private static readonly Action<ILogger, string, Guid, SubscriptionStatus, Exception?> LogWebhookProcessed =
        LoggerMessage.Define<string, Guid, SubscriptionStatus>(
            LogLevel.Information,
            new EventId(1104, nameof(HandleWebhookAsync)),
            "Processed PayPal webhook {EventType} for tenant {TenantId}; subscription status {SubscriptionStatus}");

    private static readonly Action<ILogger, string, string, Exception?> LogWebhookDuplicate =
        LoggerMessage.Define<string, string>(
            LogLevel.Information,
            new EventId(1105, "PayPalWebhookDuplicate"),
            "Ignoring duplicate PayPal webhook {EventType} with event id {EventId}");

    private static readonly Action<ILogger, string, string, Exception?> LogWebhookStale =
        LoggerMessage.Define<string, string>(
            LogLevel.Information,
            new EventId(1106, "PayPalWebhookStale"),
            "Ignoring stale PayPal webhook {EventType} with event id {EventId}");

    private static readonly Action<ILogger, string, Exception?> LogWebhookUnsupported =
        LoggerMessage.Define<string>(
            LogLevel.Information,
            new EventId(1107, "PayPalWebhookUnsupported"),
            "Ignoring unsupported PayPal webhook event type {EventType}");

    public async Task<CheckoutResponse> CreateCheckoutAsync(Guid barberShopId, CheckoutRequest request, CancellationToken cancellationToken = default)
    {
        _ = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);
        if (!request.Plan.IsPurchasable())
            throw new InvalidOperationException("Only Pro and Business require a PayPal subscription.");
        ValidateRedirect(request.ReturnUrl);
        ValidateRedirect(request.CancelUrl);
        var planId = configuration[$"PayPal:PlanIds:{request.Plan}"];
        if (string.IsNullOrWhiteSpace(planId))
            throw new InvalidOperationException($"PayPal plan {request.Plan} is not configured.");

        LogCreatingCheckout(logger, barberShopId, request.Plan, null);

        using var message = await CreateRequestAsync(HttpMethod.Post, "/v1/billing/subscriptions", cancellationToken);
        message.Content = JsonContent.Create(new
        {
            plan_id = planId,
            custom_id = $"{barberShopId:N}:{request.Plan}",
            application_context = new { brand_name = "BarberTrix", user_action = "SUBSCRIBE_NOW", return_url = request.ReturnUrl, cancel_url = request.CancelUrl }
        });
        using var response = await httpClient.SendAsync(message, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response);
        using var document = JsonDocument.Parse(body);
        var id = document.RootElement.GetProperty("id").GetString() ?? throw new InvalidOperationException("PayPal did not return a subscription id.");
        var approval = document.RootElement.GetProperty("links").EnumerateArray().FirstOrDefault(x => x.GetProperty("rel").GetString() == "approve").GetProperty("href").GetString()
            ?? throw new InvalidOperationException("PayPal did not return an approval link.");
        return new CheckoutResponse(id, approval);
    }

    public async Task<SubscriptionResponse> CaptureCheckoutAsync(Guid barberShopId, CaptureCheckoutRequest request, CancellationToken cancellationToken = default)
    {
        using var message = await CreateRequestAsync(HttpMethod.Get, $"/v1/billing/subscriptions/{Uri.EscapeDataString(request.ProviderOrderId)}", cancellationToken);
        using var response = await httpClient.SendAsync(message, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        if (!string.Equals(root.GetProperty("status").GetString(), "ACTIVE", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The PayPal subscription is not active yet.");
        var customId = root.TryGetProperty("custom_id", out var custom) ? custom.GetString() : null;
        if (customId is null || !customId.StartsWith(barberShopId.ToString("N"), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The PayPal subscription does not belong to this barbershop.");
        var plan = Enum.TryParse<SubscriptionPlan>(customId.Split(':').ElementAtOrDefault(1), true, out var parsed) ? parsed : SubscriptionPlan.Pro;
        if (!plan.IsPurchasable())
            throw new InvalidOperationException("This legacy checkout is no longer available. Start a new Pro or Business checkout.");
        var start = root.TryGetProperty("start_time", out var startValue) && DateTimeOffset.TryParse(startValue.GetString(), out var parsedStart) ? parsedStart : DateTimeOffset.UtcNow;
        var next = root.TryGetProperty("billing_info", out var billing) && billing.TryGetProperty("next_billing_time", out var nextValue) && DateTimeOffset.TryParse(nextValue.GetString(), out var parsedNext) ? parsedNext : start.AddMonths(1);
        var existing = await dbContext.Subscriptions.OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(x => x.BarberShopId == barberShopId && x.ProviderSubscriptionId == request.ProviderOrderId, cancellationToken);
        if (existing is null)
            dbContext.Subscriptions.Add(new Subscription(barberShopId, plan, "PayPal", request.ProviderOrderId, start, next));
        else
            existing.Renew(start, next);
        var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == barberShopId, cancellationToken);
        shop.ChangeSubscription(plan, SubscriptionStatus.Active);
        await dbContext.SaveChangesAsync(cancellationToken);

        LogSubscriptionActivated(logger, barberShopId, plan, null);

        return await GetSubscriptionAsync(barberShopId, cancellationToken);
    }

    public async Task<SubscriptionResponse> GetSubscriptionAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        _ = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);
        var subscription = await dbContext.Subscriptions.AsNoTracking().Where(x => x.BarberShopId == barberShopId).OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(cancellationToken);
        return subscription is null || subscription.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trialing)
            ? new SubscriptionResponse(SubscriptionPlan.Free, SubscriptionStatus.Active, "Free", null, false)
            : new SubscriptionResponse(subscription.Plan.NormalizeCommercial(), subscription.Status, subscription.Provider, subscription.PeriodEndsAtUtc, subscription.CancelAtPeriodEnd);
    }

    public async Task<SubscriptionResponse> CancelAsync(Guid barberShopId, bool atPeriodEnd, CancellationToken cancellationToken = default)
    {
        var subscription = await dbContext.Subscriptions.Where(x => x.BarberShopId == barberShopId).OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("There is no active paid subscription.");
        if (!string.IsNullOrWhiteSpace(subscription.ProviderSubscriptionId))
        {
            using var message = await CreateRequestAsync(HttpMethod.Post, $"/v1/billing/subscriptions/{Uri.EscapeDataString(subscription.ProviderSubscriptionId)}/cancel", cancellationToken);
            message.Content = JsonContent.Create(new { reason = "Cancelled by BarberTrix account owner" });
            using var response = await httpClient.SendAsync(message, cancellationToken);
            _ = await response.Content.ReadAsStringAsync(cancellationToken);
            EnsureSuccess(response);
        }
        subscription.Cancel(atPeriodEnd);
        if (!atPeriodEnd)
        {
            var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == barberShopId, cancellationToken);
            shop.ChangeSubscription(SubscriptionPlan.Free, SubscriptionStatus.Active);
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        LogSubscriptionCancelled(logger, barberShopId, atPeriodEnd, null);

        return await GetSubscriptionAsync(barberShopId, cancellationToken);
    }

    public async Task HandleWebhookAsync(string transmissionId, string transmissionTime, string certUrl, string authAlgo, string transmissionSignature, string webhookEventBody, CancellationToken cancellationToken = default)
    {
        var webhookId = configuration["PayPal:WebhookId"] ?? throw new InvalidOperationException("PayPal webhook id is not configured.");
        using var eventDocument = JsonDocument.Parse(webhookEventBody);
        using var verify = await CreateRequestAsync(HttpMethod.Post, "/v1/notifications/verify-webhook-signature", cancellationToken);
        verify.Content = JsonContent.Create(new
        {
            transmission_id = transmissionId, transmission_time = transmissionTime, cert_url = certUrl,
            auth_algo = authAlgo, transmission_sig = transmissionSignature, webhook_id = webhookId,
            webhook_event = eventDocument.RootElement
        });
        using var verificationResponse = await httpClient.SendAsync(verify, cancellationToken);
        var verificationBody = await verificationResponse.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(verificationResponse);
        using var verificationDocument = JsonDocument.Parse(verificationBody);
        if (verificationDocument.RootElement.GetProperty("verification_status").GetString() != "SUCCESS")
        {
            LogWebhookSignatureRejected(logger, null);
            throw new InvalidOperationException("Invalid PayPal webhook signature.");
        }

        var root = eventDocument.RootElement;
        var eventId = root.TryGetProperty("id", out var eventIdValue) ? eventIdValue.GetString() : null;
        var eventType = root.TryGetProperty("event_type", out var eventTypeValue) ? eventTypeValue.GetString() : null;
        var occurredAt = root.TryGetProperty("create_time", out var occurredAtValue) && DateTimeOffset.TryParse(occurredAtValue.GetString(), out var parsedOccurredAt)
            ? parsedOccurredAt.ToUniversalTime()
            : (DateTimeOffset?)null;
        if (string.IsNullOrWhiteSpace(eventId) || string.IsNullOrWhiteSpace(eventType) || occurredAt is null)
            throw new InvalidOperationException("PayPal webhook metadata is incomplete.");

        var resource = root.TryGetProperty("resource", out var resourceValue) ? resourceValue : default;
        var providerId = resource.ValueKind == JsonValueKind.Object && resource.TryGetProperty("id", out var id) ? id.GetString() : null;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        if (await WebhookReceiptExistsAsync(eventId, cancellationToken))
        {
            await transaction.CommitAsync(cancellationToken);
            LogWebhookDuplicate(logger, eventType, eventId, null);
            return;
        }

        if (string.IsNullOrWhiteSpace(providerId))
        {
            await InsertWebhookReceiptAsync(eventId, eventType, null, occurredAt.Value, false, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            LogWebhookMissingProviderId(logger, eventType, null);
            return;
        }

        var latestAppliedAt = await GetLatestAppliedWebhookOccurredAtAsync(providerId, cancellationToken);
        if (latestAppliedAt is DateTimeOffset latest && occurredAt.Value < latest)
        {
            await InsertWebhookReceiptAsync(eventId, eventType, providerId, occurredAt.Value, false, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            LogWebhookStale(logger, eventType, eventId, null);
            return;
        }

        if (!IsSupportedWebhookEvent(eventType))
        {
            await InsertWebhookReceiptAsync(eventId, eventType, providerId, occurredAt.Value, false, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            LogWebhookUnsupported(logger, eventType, null);
            return;
        }

        var subscription = await dbContext.Subscriptions.OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(x => x.ProviderSubscriptionId == providerId, cancellationToken);
        if (subscription is null)
        {
            await InsertWebhookReceiptAsync(eventId, eventType, providerId, occurredAt.Value, false, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            LogWebhookSubscriptionNotFound(logger, eventType, null);
            return;
        }

        ApplyWebhookEvent(subscription, eventType, resource, occurredAt.Value);
        var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == subscription.BarberShopId, cancellationToken);
        var activePlan = subscription.Plan.NormalizeCommercial();
        shop.ChangeSubscription(
            subscription.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing ? activePlan : SubscriptionPlan.Free,
            subscription.Status is SubscriptionStatus.Active or SubscriptionStatus.Trialing && activePlan != SubscriptionPlan.Free ? subscription.Status : SubscriptionStatus.Active);
        await InsertWebhookReceiptAsync(eventId, eventType, providerId, occurredAt.Value, true, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        LogWebhookProcessed(logger, eventType, subscription.BarberShopId, subscription.Status, null);
    }

    private async Task<HttpRequestMessage> CreateRequestAsync(HttpMethod method, string path, CancellationToken cancellationToken)
    {
        var clientId = configuration["PayPal:ClientId"] ?? throw new InvalidOperationException("PayPal client id is not configured.");
        var secret = configuration["PayPal:Secret"] ?? throw new InvalidOperationException("PayPal secret is not configured.");
        var baseUrl = configuration.GetValue("PayPal:Sandbox", true) ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
        using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/oauth2/token");
        tokenRequest.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{secret}")));
        tokenRequest.Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["grant_type"] = "client_credentials" });
        using var tokenResponse = await httpClient.SendAsync(tokenRequest, cancellationToken);
        var tokenBody = await tokenResponse.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(tokenResponse);
        using var tokenDocument = JsonDocument.Parse(tokenBody);
        var accessToken = tokenDocument.RootElement.GetProperty("access_token").GetString() ?? throw new InvalidOperationException("PayPal authentication failed.");
        var request = new HttpRequestMessage(method, $"{baseUrl}{path}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return request;
    }

    private async Task<bool> WebhookReceiptExistsAsync(string eventId, CancellationToken cancellationToken)
    {
        var transaction = dbContext.Database.CurrentTransaction ?? throw new InvalidOperationException("A database transaction is required for webhook processing.");
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = "SELECT TOP (1) 1 FROM [PayPalWebhookReceipts] WITH (UPDLOCK, HOLDLOCK) WHERE [EventId] = @eventId;";
        AddParameter(command, "@eventId", eventId, DbType.String, 128);
        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }

    private async Task<DateTimeOffset?> GetLatestAppliedWebhookOccurredAtAsync(string providerResourceId, CancellationToken cancellationToken)
    {
        var transaction = dbContext.Database.CurrentTransaction ?? throw new InvalidOperationException("A database transaction is required for webhook processing.");
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = "SELECT MAX([OccurredAtUtc]) FROM [PayPalWebhookReceipts] WITH (UPDLOCK, HOLDLOCK) WHERE [ProviderResourceId] = @providerResourceId AND [WasApplied] = 1;";
        AddParameter(command, "@providerResourceId", providerResourceId, DbType.String, 180);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is DateTimeOffset value ? value : null;
    }

    private async Task InsertWebhookReceiptAsync(string eventId, string eventType, string? providerResourceId, DateTimeOffset occurredAtUtc, bool wasApplied, CancellationToken cancellationToken)
    {
        var transaction = dbContext.Database.CurrentTransaction ?? throw new InvalidOperationException("A database transaction is required for webhook processing.");
        var connection = dbContext.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.Transaction = transaction.GetDbTransaction();
        command.CommandText = "INSERT INTO [PayPalWebhookReceipts] ([EventId], [EventType], [ProviderResourceId], [OccurredAtUtc], [ProcessedAtUtc], [WasApplied]) VALUES (@eventId, @eventType, @providerResourceId, @occurredAtUtc, @processedAtUtc, @wasApplied);";
        AddParameter(command, "@eventId", eventId, DbType.String, 128);
        AddParameter(command, "@eventType", eventType, DbType.String, 120);
        AddParameter(command, "@providerResourceId", providerResourceId ?? (object)DBNull.Value, DbType.String, 180);
        AddParameter(command, "@occurredAtUtc", occurredAtUtc, DbType.DateTimeOffset);
        AddParameter(command, "@processedAtUtc", DateTimeOffset.UtcNow, DbType.DateTimeOffset);
        AddParameter(command, "@wasApplied", wasApplied, DbType.Boolean);
        _ = await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void ApplyWebhookEvent(Subscription subscription, string eventType, JsonElement resource, DateTimeOffset occurredAtUtc)
    {
        switch (eventType)
        {
            case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
            case "BILLING.SUBSCRIPTION.SUSPENDED":
                subscription.MarkPastDue();
                break;
            case "BILLING.SUBSCRIPTION.CANCELLED":
                subscription.Cancel(false);
                break;
            case "BILLING.SUBSCRIPTION.ACTIVATED":
                var start = resource.ValueKind == JsonValueKind.Object && resource.TryGetProperty("start_time", out var startValue) && DateTimeOffset.TryParse(startValue.GetString(), out var parsedStart)
                    ? parsedStart.ToUniversalTime()
                    : occurredAtUtc;
                var next = resource.ValueKind == JsonValueKind.Object && resource.TryGetProperty("billing_info", out var billing) && billing.TryGetProperty("next_billing_time", out var nextValue) && DateTimeOffset.TryParse(nextValue.GetString(), out var parsedNext)
                    ? parsedNext.ToUniversalTime()
                    : start.AddMonths(1);
                subscription.Renew(start, next);
                break;
            default:
                throw new InvalidOperationException("Unsupported PayPal webhook event type.");
        }
    }

    private static bool IsSupportedWebhookEvent(string eventType) => eventType is
        "BILLING.SUBSCRIPTION.PAYMENT.FAILED" or
        "BILLING.SUBSCRIPTION.SUSPENDED" or
        "BILLING.SUBSCRIPTION.CANCELLED" or
        "BILLING.SUBSCRIPTION.ACTIVATED";

    private static void AddParameter(DbCommand command, string name, object value, DbType dbType, int? size = null)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = dbType;
        parameter.Value = value;
        if (size is int parameterSize)
            parameter.Size = parameterSize;
        command.Parameters.Add(parameter);
    }

    private void ValidateRedirect(string value)
    {
        var configured = configuration["PasswordReset:FrontendBaseUrl"] ?? throw new InvalidOperationException("The frontend base URL is not configured.");
        if (!Uri.TryCreate(configured, UriKind.Absolute, out var allowed) || !Uri.TryCreate(value, UriKind.Absolute, out var redirect) ||
            !string.Equals(allowed.Scheme, redirect.Scheme, StringComparison.OrdinalIgnoreCase) || !string.Equals(allowed.Authority, redirect.Authority, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The billing return URL is not allowed.");
    }

    private static void EnsureSuccess(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"PayPal request failed with status {(int)response.StatusCode}.");
    }
}