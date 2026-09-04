using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using BarberTrix.Application.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberTrix.Infrastructure.Auth;

internal sealed class ExternalIdentityVerifier(HttpClient httpClient, IConfiguration configuration) : IExternalIdentityVerifier
{
    public Task<ExternalIdentity?> VerifyAsync(string provider, string identityToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(identityToken))
            return Task.FromResult<ExternalIdentity?>(null);

        return provider.Trim().ToLowerInvariant() switch
        {
            "google" => VerifyGoogleAsync(identityToken.Trim(), cancellationToken),
            "apple" => VerifyAppleAsync(identityToken.Trim(), cancellationToken),
            _ => Task.FromResult<ExternalIdentity?>(null)
        };
    }

    private async Task<ExternalIdentity?> VerifyGoogleAsync(string identityToken, CancellationToken cancellationToken)
    {
        var configuredAudiences = GetConfiguredAudiences("ExternalAuth:Google:ClientIds");
        if (configuredAudiences.Count == 0)
            throw new InvalidOperationException("Google external authentication is not configured.");

        using var response = await httpClient.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(identityToken)}",
            cancellationToken);
        if (!response.IsSuccessStatusCode)
            return null;

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = json.RootElement;

        var audience = GetString(root, "aud");
        var subject = GetString(root, "sub");
        var email = GetString(root, "email")?.Trim().ToLowerInvariant();
        var name = GetString(root, "name")?.Trim();
        var verified = string.Equals(GetString(root, "email_verified"), "true", StringComparison.OrdinalIgnoreCase);

        if (!configuredAudiences.Contains(audience ?? string.Empty, StringComparer.Ordinal) ||
            string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email) || !verified)
            return null;

        return new ExternalIdentity("google", subject, email, string.IsNullOrWhiteSpace(name) ? DisplayNameFromEmail(email) : name, true);
    }

    private async Task<ExternalIdentity?> VerifyAppleAsync(string identityToken, CancellationToken cancellationToken)
    {
        var configuredAudiences = GetConfiguredAudiences("ExternalAuth:Apple:ClientIds");
        if (configuredAudiences.Count == 0)
            throw new InvalidOperationException("Apple external authentication is not configured.");

        try
        {
            using var keysResponse = await httpClient.GetAsync("https://appleid.apple.com/auth/keys", cancellationToken);
            if (!keysResponse.IsSuccessStatusCode)
                return null;

            var keysJson = await keysResponse.Content.ReadAsStringAsync(cancellationToken);
            var keySet = new JsonWebKeySet(keysJson);
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(identityToken, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "https://appleid.apple.com",
                ValidateAudience = true,
                ValidAudiences = configuredAudiences,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = keySet.GetSigningKeys(),
                ClockSkew = TimeSpan.FromMinutes(2)
            }, out _);

            var subject = principal.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = (principal.FindFirstValue(JwtRegisteredClaimNames.Email) ?? principal.FindFirstValue(ClaimTypes.Email))?.Trim().ToLowerInvariant();
            var emailVerifiedValue = principal.FindFirstValue("email_verified");
            var verified = string.Equals(emailVerifiedValue, "true", StringComparison.OrdinalIgnoreCase) || emailVerifiedValue == "1";

            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email) || !verified)
                return null;

            return new ExternalIdentity("apple", subject, email, DisplayNameFromEmail(email), true);
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException or JsonException)
        {
            return null;
        }
    }

    private IReadOnlyList<string> GetConfiguredAudiences(string key)
    {
        var value = configuration[key];
        if (string.IsNullOrWhiteSpace(value))
            return Array.Empty<string>();

        return value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private static string? GetString(JsonElement root, string property) =>
        root.TryGetProperty(property, out var value) ? value.ToString() : null;

    private static string DisplayNameFromEmail(string email)
    {
        var localPart = email.Split('@', 2)[0].Replace('.', ' ').Replace('_', ' ').Trim();
        return string.IsNullOrWhiteSpace(localPart) ? "Cliente BarberTrix" : localPart;
    }
}
