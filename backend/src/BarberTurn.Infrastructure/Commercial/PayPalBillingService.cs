using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BarberTurn.Application.Commercial;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BarberTurn.Infrastructure.Commercial;

internal sealed class PayPalBillingService(HttpClient httpClient, ApplicationDbContext dbContext, IConfiguration configuration) : IBillingService
{
    public async Task<CheckoutResponse> CreateCheckoutAsync(Guid barberShopId, CheckoutRequest request, CancellationToken cancellationToken = default)
    {
        _ = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);
        ValidateRedirect(request.ReturnUrl);
        ValidateRedirect(request.CancelUrl);
        var planId = configuration[$"PayPal:PlanIds:{request.Plan}"];
        if (string.IsNullOrWhiteSpace(planId))
            throw new InvalidOperationException($"PayPal plan {request.Plan} is not configured.");
        using var message = await CreateRequestAsync(HttpMethod.Post, "/v1/billing/subscriptions", cancellationToken);
        message.Content = JsonContent.Create(new
        {
            plan_id = planId,
            custom_id = $"{barberShopId:N}:{request.Plan}",
            application_context = new { brand_name = "BarberTurn", user_action = "SUBSCRIBE_NOW", return_url = request.ReturnUrl, cancel_url = request.CancelUrl }
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
        return await GetSubscriptionAsync(barberShopId, cancellationToken);
    }

    public async Task<SubscriptionResponse> GetSubscriptionAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var shop = await dbContext.BarberShops.AsNoTracking().SingleAsync(x => x.Id == barberShopId, cancellationToken);
        var subscription = await dbContext.Subscriptions.AsNoTracking().Where(x => x.BarberShopId == barberShopId).OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(cancellationToken);
        return subscription is null
            ? new SubscriptionResponse(shop.Plan, shop.SubscriptionStatus, "Trial", shop.TrialEndsAtUtc, false)
            : new SubscriptionResponse(subscription.Plan, subscription.Status, subscription.Provider, subscription.PeriodEndsAtUtc, subscription.CancelAtPeriodEnd);
    }

    public async Task<SubscriptionResponse> CancelAsync(Guid barberShopId, bool atPeriodEnd, CancellationToken cancellationToken = default)
    {
        var subscription = await dbContext.Subscriptions.Where(x => x.BarberShopId == barberShopId).OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("There is no active paid subscription.");
        if (!string.IsNullOrWhiteSpace(subscription.ProviderSubscriptionId))
        {
            using var message = await CreateRequestAsync(HttpMethod.Post, $"/v1/billing/subscriptions/{Uri.EscapeDataString(subscription.ProviderSubscriptionId)}/cancel", cancellationToken);
            message.Content = JsonContent.Create(new { reason = "Cancelled by BarberTurn account owner" });
            using var response = await httpClient.SendAsync(message, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            EnsureSuccess(response);
        }
        subscription.Cancel(atPeriodEnd);
        if (!atPeriodEnd)
        {
            var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == barberShopId, cancellationToken);
            shop.ChangeSubscription(shop.Plan, SubscriptionStatus.Cancelled);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
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
            throw new InvalidOperationException("Invalid PayPal webhook signature.");

        var eventType = eventDocument.RootElement.GetProperty("event_type").GetString();
        var resource = eventDocument.RootElement.GetProperty("resource");
        var providerId = resource.TryGetProperty("id", out var id) ? id.GetString() : null;
        if (providerId is null)
            return;
        var subscription = await dbContext.Subscriptions.OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync(x => x.ProviderSubscriptionId == providerId, cancellationToken);
        if (subscription is null)
            return;
        if (eventType is "BILLING.SUBSCRIPTION.PAYMENT.FAILED" or "BILLING.SUBSCRIPTION.SUSPENDED") subscription.MarkPastDue();
        if (eventType == "BILLING.SUBSCRIPTION.CANCELLED") subscription.Cancel(false);
        if (eventType == "BILLING.SUBSCRIPTION.ACTIVATED") subscription.Renew(DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddMonths(1));
        var shop = await dbContext.BarberShops.SingleAsync(x => x.Id == subscription.BarberShopId, cancellationToken);
        shop.ChangeSubscription(subscription.Plan, subscription.Status);
        await dbContext.SaveChangesAsync(cancellationToken);
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
