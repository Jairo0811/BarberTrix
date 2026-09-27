using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BarberTrix.Application.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BarberTrix.Infrastructure.Auth;

internal sealed class ExternalOAuthBroker(
    HttpClient httpClient,
    IConfiguration configuration,
    IExternalIdentityVerifier identityVerifier,
    IExternalAuthService externalAuthService) : IExternalOAuthBroker
{
    private const string StateAudience = "BarberTrix.ExternalOAuthState";
    private const string HandoffAudience = "BarberTrix.ExternalOAuthHandoff";

    public string CreateAuthorizationUrl(string provider, string returnUri, string codeChallenge)
    {
        provider = NormalizeProvider(provider);
        ValidateReturnUri(returnUri);
        ValidateCodeChallenge(codeChallenge);

        var callbackUrl = CallbackUrl(provider);
        var state = CreateSignedToken(
            StateAudience,
            DateTimeOffset.UtcNow.AddMinutes(10),
            new Claim("kind", "oauth_state"),
            new Claim("provider", provider),
            new Claim("return_uri", returnUri),
            new Claim("code_challenge", codeChallenge),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")));

        return provider switch
        {
            "google" => BuildGoogleAuthorizationUrl(callbackUrl, state),
            "apple" => BuildAppleAuthorizationUrl(callbackUrl, state),
            _ => throw new InvalidOperationException("Unsupported external authentication provider.")
        };
    }

    public async Task<string> CompleteAuthorizationAsync(
        string provider,
        string code,
        string state,
        CancellationToken cancellationToken = default)
    {
        provider = NormalizeProvider(provider);
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            throw new InvalidOperationException("External authorization response is incomplete.");

        var statePrincipal = ValidateSignedToken(state, StateAudience);
        if (statePrincipal?.FindFirstValue("kind") != "oauth_state" ||
            !string.Equals(statePrincipal.FindFirstValue("provider"), provider, StringComparison.Ordinal))
            throw new InvalidOperationException("External authorization state is invalid or expired.");

        var returnUri = statePrincipal.FindFirstValue("return_uri")
            ?? throw new InvalidOperationException("External return URI is missing.");
        var codeChallenge = statePrincipal.FindFirstValue("code_challenge")
            ?? throw new InvalidOperationException("External PKCE challenge is missing.");
        ValidateReturnUri(returnUri);
        ValidateCodeChallenge(codeChallenge);

        var identityToken = provider switch
        {
            "google" => await ExchangeGoogleCodeAsync(code, cancellationToken),
            "apple" => await ExchangeAppleCodeAsync(code, cancellationToken),
            _ => null
        };
        if (string.IsNullOrWhiteSpace(identityToken))
            throw new InvalidOperationException("External provider token exchange failed.");

        var identity = await identityVerifier.VerifyAsync(provider, identityToken, cancellationToken)
            ?? throw new InvalidOperationException("External identity could not be verified.");

        var handoff = CreateSignedToken(
            HandoffAudience,
            DateTimeOffset.UtcNow.AddMinutes(2),
            new Claim("kind", "oauth_handoff"),
            new Claim("provider", identity.Provider),
            new Claim("provider_sub", identity.Subject),
            new Claim(JwtRegisteredClaimNames.Email, identity.Email),
            new Claim(ClaimTypes.Name, identity.Name),
            new Claim("email_verified", identity.EmailVerified ? "true" : "false"),
            new Claim("code_challenge", codeChallenge),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")));

        return AppendQuery(returnUri, "code", handoff);
    }

    public async Task<AuthResponse?> ExchangeAsync(
        ExternalOAuthExchangeRequest request,
        string? userAgent,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.CodeVerifier))
            return null;

        var principal = ValidateSignedToken(request.Code, HandoffAudience);
        if (principal?.FindFirstValue("kind") != "oauth_handoff")
            return null;

        var expectedChallenge = principal.FindFirstValue("code_challenge");
        if (string.IsNullOrWhiteSpace(expectedChallenge) ||
            !CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(expectedChallenge),
                Encoding.ASCII.GetBytes(CreateCodeChallenge(request.CodeVerifier))))
            return null;

        var provider = principal.FindFirstValue("provider");
        var subject = principal.FindFirstValue("provider_sub");
        var email = principal.FindFirstValue(JwtRegisteredClaimNames.Email) ?? principal.FindFirstValue(ClaimTypes.Email);
        var name = principal.FindFirstValue(ClaimTypes.Name);
        var emailVerified = string.Equals(principal.FindFirstValue("email_verified"), "true", StringComparison.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(subject) ||
            string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(name) || !emailVerified)
            return null;

        return await externalAuthService.LoginVerifiedAsync(
            new ExternalIdentity(provider, subject, email, name, true),
            userAgent,
            ipAddress,
            cancellationToken);
    }

    private string BuildGoogleAuthorizationUrl(string callbackUrl, string state)
    {
        var clientId = Required("ExternalAuth:Google:ClientId");
        var query = new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["redirect_uri"] = callbackUrl,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["prompt"] = "select_account"
        };
        return BuildUrl("https://accounts.google.com/o/oauth2/v2/auth", query);
    }

    private string BuildAppleAuthorizationUrl(string callbackUrl, string state)
    {
        var clientId = Required("ExternalAuth:Apple:ClientId");
        var query = new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["redirect_uri"] = callbackUrl,
            ["response_type"] = "code",
            ["response_mode"] = "form_post",
            ["scope"] = "name email",
            ["state"] = state
        };
        return BuildUrl("https://appleid.apple.com/auth/authorize", query);
    }

    private async Task<string?> ExchangeGoogleCodeAsync(string code, CancellationToken cancellationToken)
    {
        using var response = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = Required("ExternalAuth:Google:ClientId"),
                ["client_secret"] = Required("ExternalAuth:Google:ClientSecret"),
                ["redirect_uri"] = CallbackUrl("google"),
                ["grant_type"] = "authorization_code"
            }), cancellationToken);
        return await ReadIdentityTokenAsync(response, cancellationToken);
    }

    private async Task<string?> ExchangeAppleCodeAsync(string code, CancellationToken cancellationToken)
    {
        using var response = await httpClient.PostAsync(
            "https://appleid.apple.com/auth/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = Required("ExternalAuth:Apple:ClientId"),
                ["client_secret"] = CreateAppleClientSecret(),
                ["redirect_uri"] = CallbackUrl("apple"),
                ["grant_type"] = "authorization_code"
            }), cancellationToken);
        return await ReadIdentityTokenAsync(response, cancellationToken);
    }

    private static async Task<string?> ReadIdentityTokenAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
            return null;
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        return json.RootElement.TryGetProperty("id_token", out var token) ? token.GetString() : null;
    }

    private string CreateAppleClientSecret()
    {
        var privateKey = Required("ExternalAuth:Apple:PrivateKey").Replace("\\n", "\n", StringComparison.Ordinal);
        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(privateKey);
        var key = new ECDsaSecurityKey(ecdsa) { KeyId = Required("ExternalAuth:Apple:KeyId") };
        var credentials = new SigningCredentials(key, SecurityAlgorithms.EcdsaSha256);
        var now = DateTimeOffset.UtcNow;
        var token = new JwtSecurityToken(
            issuer: Required("ExternalAuth:Apple:TeamId"),
            audience: "https://appleid.apple.com",
            claims: [new Claim(JwtRegisteredClaimNames.Sub, Required("ExternalAuth:Apple:ClientId"))],
            notBefore: now.UtcDateTime,
            expires: now.AddMinutes(10).UtcDateTime,
            signingCredentials: credentials);
        token.Header[JwtHeaderParameterNames.Kid] = key.KeyId;
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string CallbackUrl(string provider) =>
        $"{Required("ExternalAuth:PublicBaseUrl").TrimEnd('/')}/api/auth/mobile/oauth/{provider}/callback";

    private string CreateSignedToken(string audience, DateTimeOffset expiresAt, params Claim[] claims)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Required("Jwt:Key"))),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"] ?? "BarberTrix.Api",
            audience,
            claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private ClaimsPrincipal? ValidateSignedToken(string token, string audience)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = configuration["Jwt:Issuer"] ?? "BarberTrix.Api",
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Required("Jwt:Key"))),
                ClockSkew = TimeSpan.FromSeconds(30)
            }, out var validated);
            return validated is JwtSecurityToken jwt && jwt.Header.Alg == SecurityAlgorithms.HmacSha256 ? principal : null;
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
        {
            return null;
        }
    }

    private static string CreateCodeChallenge(string verifier)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(verifier));
        return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static void ValidateCodeChallenge(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length is < 43 or > 128 ||
            value.Any(ch => !(char.IsLetterOrDigit(ch) || ch is '-' or '_')))
            throw new ArgumentException("Invalid PKCE challenge.");
    }

    private void ValidateReturnUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            throw new ArgumentException("Invalid external authentication return URI.");

        if (uri.Scheme is "barbertrix" or "exp" or "exps")
            return;

        var webReturnUri = configuration["ExternalAuth:WebReturnUri"]?.Trim();
        if (!string.IsNullOrWhiteSpace(webReturnUri) &&
            string.Equals(value, webReturnUri, StringComparison.Ordinal))
            return;

        throw new ArgumentException("External authentication return URI is not allowed.");
    }

    private static string NormalizeProvider(string provider) => provider.Trim().ToLowerInvariant() switch
    {
        "google" => "google",
        "apple" => "apple",
        _ => throw new ArgumentException("Unsupported external authentication provider.")
    };

    private string Required(string key) =>
        !string.IsNullOrWhiteSpace(configuration[key])
            ? configuration[key]!.Trim()
            : throw new InvalidOperationException($"{key} is not configured.");

    private static string BuildUrl(string baseUrl, IReadOnlyDictionary<string, string> query) =>
        $"{baseUrl}?{string.Join('&', query.Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"))}";

    private static string AppendQuery(string uri, string key, string value) =>
        $"{uri}{(uri.Contains('?', StringComparison.Ordinal) ? '&' : '?')}{Uri.EscapeDataString(key)}={Uri.EscapeDataString(value)}";
}
