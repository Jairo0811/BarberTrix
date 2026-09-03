using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class CashManagementTests(BarberTrixFactory factory)
{
    [Fact]
    public async Task CashSessionReconcilesOpeningSalesMovementsAndClosingCount()
    {
        using var client = CreateClient();
        await RegisterAndAuthenticateAsync(client, "Cash Reconciliation");

        var cashWithoutSession = await client.PostAsJsonAsync("/api/payments", new
        {
            amount = 500m,
            currency = "DOP",
            method = "Cash",
            externalReference = "cash-before-open"
        });
        Assert.Equal(HttpStatusCode.BadRequest, cashWithoutSession.StatusCode);

        var openedResponse = await client.PostAsJsonAsync("/api/cash/open", new { currency = "DOP", openingBalance = 1000m });
        Assert.Equal(HttpStatusCode.Created, openedResponse.StatusCode);
        var opened = await openedResponse.Content.ReadFromJsonAsync<CashSessionPayload>();
        Assert.NotNull(opened);
        Assert.Equal(1000m, opened.ExpectedCash);

        var wrongCurrency = await client.PostAsJsonAsync("/api/payments", new
        {
            amount = 10m,
            currency = "USD",
            method = "Cash",
            externalReference = "wrong-currency"
        });
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrency.StatusCode);

        var paymentResponse = await client.PostAsJsonAsync("/api/payments", new
        {
            amount = 500m,
            currency = "DOP",
            method = "Cash",
            externalReference = "cash-sale-001"
        });
        Assert.Equal(HttpStatusCode.Created, paymentResponse.StatusCode);

        var movementResponse = await client.PostAsJsonAsync("/api/cash/movements", new
        {
            type = "CashOut",
            amount = 100m,
            reason = "Compra de insumos"
        });
        Assert.Equal(HttpStatusCode.Created, movementResponse.StatusCode);
        var afterMovement = await movementResponse.Content.ReadFromJsonAsync<CashSessionPayload>();
        Assert.NotNull(afterMovement);
        Assert.Equal(500m, afterMovement.CashSales);
        Assert.Equal(100m, afterMovement.CashOut);
        Assert.Equal(1400m, afterMovement.ExpectedCash);

        var closeResponse = await client.PostAsJsonAsync("/api/cash/close", new
        {
            countedCash = 1390m,
            note = "Cierre de prueba"
        });
        closeResponse.EnsureSuccessStatusCode();
        var closed = await closeResponse.Content.ReadFromJsonAsync<CashSessionPayload>();
        Assert.NotNull(closed);
        Assert.NotNull(closed.ClosedAtUtc);
        Assert.Equal(1390m, closed.CountedCash);
        Assert.Equal(-10m, closed.Difference);

        var current = await client.GetAsync("/api/cash/current");
        Assert.Equal(HttpStatusCode.NoContent, current.StatusCode);

        var history = await client.GetFromJsonAsync<List<CashSessionPayload>>("/api/cash/sessions?take=5");
        Assert.NotNull(history);
        var persisted = Assert.Single(history);
        Assert.Equal(closed.Id, persisted.Id);
        Assert.Equal(-10m, persisted.Difference);
    }

    [Fact]
    public async Task CashRefundCreatesCashOutAndKeepsGrossSaleTraceable()
    {
        using var client = CreateClient();
        await RegisterAndAuthenticateAsync(client, "Cash Refund");

        var opened = await client.PostAsJsonAsync("/api/cash/open", new { currency = "DOP", openingBalance = 1000m });
        opened.EnsureSuccessStatusCode();

        var paymentResponse = await client.PostAsJsonAsync("/api/payments", new
        {
            amount = 500m,
            currency = "DOP",
            method = "Cash",
            externalReference = "refund-sale-001"
        });
        paymentResponse.EnsureSuccessStatusCode();
        var payment = await paymentResponse.Content.ReadFromJsonAsync<PaymentPayload>();
        Assert.NotNull(payment);

        var refundResponse = await client.PostAsJsonAsync($"/api/payments/{payment.Id}/refund", new { reason = "Cliente canceló" });
        refundResponse.EnsureSuccessStatusCode();
        var refunded = await refundResponse.Content.ReadFromJsonAsync<PaymentPayload>();
        Assert.NotNull(refunded);
        Assert.Equal("Refunded", refunded.Status);

        var current = await client.GetFromJsonAsync<CashSessionPayload>("/api/cash/current");
        Assert.NotNull(current);
        Assert.Equal(500m, current.CashSales);
        Assert.Equal(500m, current.CashOut);
        Assert.Equal(1000m, current.ExpectedCash);
        Assert.Contains(current.Movements, movement => movement.Type == "CashOut" && movement.Amount == 500m);
    }

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false,
        HandleCookies = true
    });

    private static async Task RegisterAndAuthenticateAsync(HttpClient client, string shopName)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var response = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = shopName,
            barberShopSlug = $"{shopName.ToLowerInvariant().Replace(' ', '-')}-{suffix}",
            name = $"Owner {suffix}",
            email = $"cash-owner-{suffix}@example.com",
            password = "ValidPass123!",
            timeZoneId = "America/Santo_Domingo",
            acceptedTerms = true
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(auth);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
    }

    private sealed record AuthPayload(string AccessToken);
    private sealed record PaymentPayload(Guid Id, string Status);
    private sealed record CashMovementPayload(Guid Id, string Type, decimal Amount, string Reason, DateTimeOffset CreatedAtUtc);
    private sealed record CashSessionPayload(
        Guid Id,
        string Currency,
        decimal OpeningBalance,
        DateTimeOffset OpenedAtUtc,
        DateTimeOffset? ClosedAtUtc,
        decimal CashSales,
        decimal NonCashSales,
        decimal CashIn,
        decimal CashOut,
        decimal ExpectedCash,
        decimal? CountedCash,
        decimal? Difference,
        string? ClosingNote,
        IReadOnlyList<CashMovementPayload> Movements);
}
