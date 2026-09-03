using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace BarberTrix.Infrastructure.Push;

internal sealed record ExpoPushMessage(
    Guid OutboxId,
    string ExpoPushToken,
    string Title,
    string Body,
    string Route);

internal sealed record ExpoPushResult(
    Guid OutboxId,
    bool Accepted,
    string? TicketId,
    string? ErrorCode,
    string? ErrorMessage)
{
    public bool IsUnregisteredDevice => string.Equals(ErrorCode, "DeviceNotRegistered", StringComparison.Ordinal);
    public bool IsRetryable => string.Equals(ErrorCode, "MessageRateExceeded", StringComparison.Ordinal);
}

internal interface IExpoPushGateway
{
    Task<IReadOnlyList<ExpoPushResult>> SendAsync(
        IReadOnlyList<ExpoPushMessage> messages,
        CancellationToken cancellationToken = default);
}

internal sealed class ExpoPushGateway(HttpClient httpClient, IConfiguration configuration) : IExpoPushGateway
{
    private const string DefaultEndpoint = "https://exp.host/--/api/v2/push/send";

    public async Task<IReadOnlyList<ExpoPushResult>> SendAsync(
        IReadOnlyList<ExpoPushMessage> messages,
        CancellationToken cancellationToken = default)
    {
        if (messages.Count == 0)
            return [];
        if (messages.Count > 100)
            throw new ArgumentException("Expo accepts at most 100 push messages per request.", nameof(messages));

        var endpoint = configuration["Push:ExpoEndpoint"] ?? DefaultEndpoint;
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(messages.Select(message => new ExpoRequest(
                message.ExpoPushToken,
                message.Title,
                message.Body,
                new ExpoData(message.Route),
                "default",
                "high")).ToArray())
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        var accessToken = configuration["Push:AccessToken"];
        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<ExpoResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Expo returned an empty push response.");
        if (payload.Data.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("Expo returned an invalid push response.");

        var tickets = payload.Data.EnumerateArray().ToArray();
        var results = new List<ExpoPushResult>(messages.Count);
        for (var index = 0; index < messages.Count; index++)
        {
            if (index >= tickets.Length)
            {
                results.Add(new ExpoPushResult(messages[index].OutboxId, false, null, null, "Expo did not return a ticket."));
                continue;
            }

            var ticket = tickets[index].Deserialize<ExpoTicket>();
            results.Add(new ExpoPushResult(
                messages[index].OutboxId,
                string.Equals(ticket?.Status, "ok", StringComparison.Ordinal),
                ticket?.Id,
                ticket?.Details?.Error,
                ticket?.Message));
        }

        return results;
    }

    private sealed record ExpoRequest(
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("body")] string Body,
        [property: JsonPropertyName("data")] ExpoData Data,
        [property: JsonPropertyName("sound")] string Sound,
        [property: JsonPropertyName("priority")] string Priority);

    private sealed record ExpoData([property: JsonPropertyName("url")] string Url);
    private sealed record ExpoResponse([property: JsonPropertyName("data")] JsonElement Data);
    private sealed record ExpoTicket(
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("id")] string? Id,
        [property: JsonPropertyName("message")] string? Message,
        [property: JsonPropertyName("details")] ExpoTicketDetails? Details);
    private sealed record ExpoTicketDetails([property: JsonPropertyName("error")] string? Error);
}
