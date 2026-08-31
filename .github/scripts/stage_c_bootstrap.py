from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"{label} marker not found")
    return text.replace(old, new, 1)


# Domain: allow a user identity without an active tenant while preserving the
# existing tenant-bound constructor for the rest of the application.
path = Path("backend/src/BarberTurn.Domain/Entities/DomainEntities.cs")
text = path.read_text()
start = text.index("public sealed class User : BaseEntity")
end = text.index("public enum SubscriptionPlan")
user_class = '''public sealed class User : BaseEntity
{
    private User() { }

    private User(Guid? barberShopId, string name, string email, string passwordHash, UserRole role, Guid? barberId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.", nameof(email));

        BarberShopId = barberShopId;
        Name = name.Trim();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        Role = role;
        BarberId = barberId;
    }

    public User(Guid barberShopId, string name, string email, string passwordHash, UserRole role, Guid? barberId = null)
        : this(barberShopId == Guid.Empty ? throw new ArgumentException("Barbershop is required.", nameof(barberShopId)) : barberShopId,
            name, email, passwordHash, role, barberId)
    {
    }

    public static User CreateIndependentBarber(string name, string email, string passwordHash) =>
        new(null, name, email, passwordHash, UserRole.Barber, null);

    public Guid? BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public Guid? BarberId { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public string SecurityStamp { get; private set; } = Guid.NewGuid().ToString("N");
    public bool IsActive { get; private set; } = true;

    public void ChangePasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));

        PasswordHash = passwordHash;
        SecurityStamp = Guid.NewGuid().ToString("N");
        Touch();
    }

    public void MarkEmailVerified()
    {
        IsEmailVerified = true;
        Touch();
    }

    public void ChangeRole(UserRole role, Guid? barberId)
    {
        Role = role;
        BarberId = role == UserRole.Barber ? barberId : null;
        SecurityStamp = Guid.NewGuid().ToString("N");
        Touch();
    }

    public void Deactivate()
    {
        IsActive = false;
        SecurityStamp = Guid.NewGuid().ToString("N");
        Touch();
    }
}

'''
path.write_text(text[:start] + user_class + text[end:])

# Application contracts.
path = Path("backend/src/BarberTurn.Application/Auth/AuthContracts.cs")
text = path.read_text()
text = replace_once(
    text,
    "public sealed record LoginRequest(string Email, string Password);",
    '''public sealed record RegisterBarberRequest(
    string Name,
    string Email,
    string Password,
    bool AcceptedTerms = false,
    string? CaptchaToken = null);
public sealed record LoginRequest(string Email, string Password);''',
    "register-barber request",
)
text = replace_once(
    text,
    "    Guid BarberShopId,\n    Guid? BarberId,\n    string Name,\n    string Role,\n    bool IsEmailVerified);",
    "    Guid? BarberShopId,\n    Guid? BarberId,\n    string Name,\n    string Role,\n    bool IsEmailVerified,\n    string SessionScope);",
    "auth response",
)
text = replace_once(
    text,
    "    Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);",
    "    Task<AuthResponse> RegisterOwnerAsync(RegisterOwnerRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);\n    Task<AuthResponse> RegisterBarberAsync(RegisterBarberRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default);",
    "auth service contract",
)
path.write_text(text)

# Auth implementation.
path = Path("backend/src/BarberTurn.Infrastructure/Auth/AuthService.cs")
text = path.read_text()
login_marker = "    public async Task<AuthResponse?> LoginAsync(LoginRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)\n"
register_method = '''    public async Task<AuthResponse> RegisterBarberAsync(RegisterBarberRequest request, string? userAgent, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateBarberRegistration(request);
        if (!await humanVerification.VerifyAsync(request.CaptchaToken, ipAddress, cancellationToken))
            throw new InvalidOperationException("Human verification failed.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await dbContext.Users.AnyAsync(x => x.Email == normalizedEmail, cancellationToken))
            throw new InvalidOperationException("A user with that email already exists.");

        var shell = User.CreateIndependentBarber(request.Name, normalizedEmail, string.Empty);
        var user = User.CreateIndependentBarber(
            request.Name,
            normalizedEmail,
            passwordHasher.HashPassword(shell, request.Password));
        if (!configuration.GetValue("Auth:RequireVerifiedEmail", false))
            user.MarkEmailVerified();

        dbContext.Users.Add(user);
        dbContext.BarberProfiles.Add(new BarberProfile(user.Id, user.Name));
        await dbContext.SaveChangesAsync(cancellationToken);

        if (!user.IsEmailVerified)
            await SendVerificationEmailAsync(user, cancellationToken);

        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);
    }

'''
text = replace_once(text, login_marker, register_method + login_marker, "login method")
text = text.replace(
    "var userIds = dbContext.Users.Where(x => shopIds.Contains(x.BarberShopId)).Select(x => x.Id);",
    "var userIds = dbContext.Users.Where(x => x.BarberShopId.HasValue && shopIds.Contains(x.BarberShopId.Value)).Select(x => x.Id);",
)
text = text.replace(
    "await dbContext.Users.Where(x => shopIds.Contains(x.BarberShopId)).ExecuteDeleteAsync(cancellationToken);",
    "await dbContext.Users.Where(x => x.BarberShopId.HasValue && shopIds.Contains(x.BarberShopId.Value)).ExecuteDeleteAsync(cancellationToken);",
)
claims_start = text.index("        var claims = new List<Claim>")
claims_end = text.index("        var credentials =", claims_start)
new_claims = '''        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.Name), new("security_stamp", user.SecurityStamp),
            new("email_verified", user.IsEmailVerified ? "true" : "false")
        };
        var sessionScope = user.BarberShopId.HasValue ? "Tenant" : "Onboarding";
        if (user.BarberShopId is Guid barberShopId)
        {
            claims.Add(new Claim("barbershop_id", barberShopId.ToString()));
            claims.Add(new Claim(ClaimTypes.Role, user.Role.ToString()));
            if (user.BarberId is Guid barberId)
                claims.Add(new Claim("barber_id", barberId.ToString()));
        }
'''
text = text[:claims_start] + new_claims + text[claims_end:]
text = replace_once(
    text,
    "return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, refreshToken, refreshExpiresAtUtc, user.Id, user.BarberShopId, user.BarberId, user.Name, user.Role.ToString(), user.IsEmailVerified);",
    "return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, refreshToken, refreshExpiresAtUtc, user.Id, user.BarberShopId, user.BarberId, user.Name, user.Role.ToString(), user.IsEmailVerified, sessionScope);",
    "auth response construction",
)
validation_marker = "    private static bool IsStrongPassword(string? password) =>"
validation_method = '''    private static void ValidateBarberRegistration(RegisterBarberRequest request)
    {
        if (!request.AcceptedTerms) throw new ArgumentException("Terms must be accepted.");
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 120) throw new ArgumentException("A valid name is required.");
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@') || request.Email.Length > 180) throw new ArgumentException("A valid email is required.");
        if (!IsStrongPassword(request.Password)) throw new ArgumentException("Password must contain at least 10 characters, uppercase, lowercase, number and symbol.");
    }

'''
text = replace_once(text, validation_marker, validation_method + validation_marker, "password validation")
path.write_text(text)

# Existing seeded administrators remain tenant-bound.
path = Path("backend/src/BarberTurn.Infrastructure/Persistence/DevelopmentDataSeeder.cs")
text = path.read_text()
text = replace_once(
    text,
    "            var existingShop = await dbContext.BarberShops.SingleAsync(x => x.Id == existingUser.BarberShopId, cancellationToken);",
    "            var existingShopId = existingUser.BarberShopId ?? throw new InvalidOperationException(\"Seeded administrator is missing tenant context.\");\n            var existingShop = await dbContext.BarberShops.SingleAsync(x => x.Id == existingShopId, cancellationToken);",
    "seeder tenant",
)
text = text.replace(
    "x => x.UserId == existingUser.Id && x.BarberShopId == existingUser.BarberShopId,",
    "x => x.UserId == existingUser.Id && x.BarberShopId == existingShopId,",
)
text = text.replace(
    "                    existingUser.BarberShopId,\n                    UserRole.Administrator));",
    "                    existingShopId,\n                    UserRole.Administrator));",
)
path.write_text(text)

# Tenant-bound authorization policy.
path = Path("backend/src/BarberTurn.Infrastructure/DependencyInjection.cs")
text = path.read_text()
old_authorization = '        services.AddAuthorization(options =>\n            options.AddPolicy("VerifiedUser", policy => policy.RequireAuthenticatedUser().RequireClaim("email_verified", "true")));'
new_authorization = '''        services.AddAuthorization(options =>
        {
            options.AddPolicy("VerifiedUser", policy =>
                policy.RequireAuthenticatedUser().RequireClaim("email_verified", "true"));
            options.AddPolicy("TenantUser", policy =>
                policy.RequireAuthenticatedUser()
                    .RequireClaim("email_verified", "true")
                    .RequireClaim("barbershop_id")
                    .RequireClaim(System.Security.Claims.ClaimTypes.Role));
        });'''
text = replace_once(text, old_authorization, new_authorization, "authorization policies")
path.write_text(text)

for endpoint_path in Path("backend/src/BarberTurn.Api/Endpoints").glob("*.cs"):
    endpoint_text = endpoint_path.read_text().replace(
        '.RequireAuthorization("VerifiedUser")',
        '.RequireAuthorization("TenantUser")',
    )
    endpoint_path.write_text(endpoint_text)

# Register-barber endpoint and nullable session DTOs.
path = Path("backend/src/BarberTurn.Api/Endpoints/AuthEndpoints.cs")
text = path.read_text()
login_endpoint_marker = '        group.MapPost("/login", async (LoginRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>\n'
register_endpoint = '''        group.MapPost("/register-barber", async (RegisterBarberRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await authService.RegisterBarberAsync(request, UserAgent(context), Ip(context), cancellationToken);
                WriteRefreshCookie(context, response);
                return Results.Ok(ToClientResponse(response));
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ApiError.From(context, ApiErrorCodes.AuthRegistrationConflict, ex.Message));
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ApiError.From(context, ApiErrorCodes.AuthRegistrationInvalid, ex.Message));
            }
        }).RequireRateLimiting("registration");

'''
text = replace_once(text, login_endpoint_marker, register_endpoint + login_endpoint_marker, "login endpoint")
text = text.replace(
    "        response.Role,\n        response.IsEmailVerified);",
    "        response.Role,\n        response.IsEmailVerified,\n        response.SessionScope);",
)
text = text.replace("        Guid BarberShopId,", "        Guid? BarberShopId,")
text = text.replace(
    "        string Role,\n        bool IsEmailVerified);",
    "        string Role,\n        bool IsEmailVerified,\n        string SessionScope);",
)
path.write_text(text)

# Web session compatibility and onboarding guard.
path = Path("frontend/src/types.ts")
text = path.read_text().replace("  barberShopId: string\n", "  barberShopId: string | null\n")
text = text.replace(
    "  isEmailVerified: boolean\n}",
    "  isEmailVerified: boolean\n  sessionScope: 'Tenant' | 'Onboarding'\n}",
)
path.write_text(text)

path = Path("frontend/src/App.tsx")
text = path.read_text()
barber_portal_marker = "  if (auth?.role === 'Barber') return"
onboarding_block = '''  if (auth?.sessionScope === 'Onboarding') return <main className="login-shell"><section className="login-card">
    <BarberTurnLogo /><h1>Tu perfil de barbero está listo</h1>
    <p className="login-subtitle">Todavía no perteneces a una barbería. En la siguiente etapa podrás aceptar invitaciones, solicitar ingreso o usar un código de incorporación.</p>
    <button className="demo-button" type="button" onClick={logout}>Cerrar sesión</button>
  </section></main>

'''
text = replace_once(text, barber_portal_marker, onboarding_block + barber_portal_marker, "web barber portal")
path.write_text(text)

# Mobile understands onboarding as an authenticated identity without tenant access.
path = Path("mobile/src/auth/types.ts")
text = path.read_text().replace(
    "export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';",
    "export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'onboarding';",
)
text = text.replace("  barberShopId: string;\n", "  barberShopId: string | null;\n")
text = text.replace(
    "  isEmailVerified: boolean;\n};",
    "  isEmailVerified: boolean;\n  sessionScope: 'Tenant' | 'Onboarding';\n};",
    1,
)
text = text.replace(
    "  isEmailVerified: boolean;\n};\n\nexport type StoredRefreshSession",
    "  isEmailVerified: boolean;\n  sessionScope: 'Tenant' | 'Onboarding';\n};\n\nexport type StoredRefreshSession",
)
path.write_text(text)

path = Path("mobile/src/auth/AuthProvider.tsx")
text = path.read_text().replace(
    "      isEmailVerified: response.isEmailVerified,\n",
    "      isEmailVerified: response.isEmailVerified,\n      sessionScope: response.sessionScope,\n",
)
text = text.replace(
    "    setStatus('authenticated');",
    "    setStatus(response.sessionScope === 'Onboarding' ? 'onboarding' : 'authenticated');",
)
text = text.replace(
    "    router.replace('/(app)');",
    "    router.replace(response.sessionScope === 'Onboarding' ? '/onboarding' : '/(app)');",
)
path.write_text(text)

path = Path("mobile/app/index.tsx")
text = path.read_text().replace(
    "  return <Redirect href={status === 'authenticated' ? '/(app)' : '/(auth)/login'} />;",
    "  if (status === 'onboarding') return <Redirect href=\"/onboarding\" />;\n  return <Redirect href={status === 'authenticated' ? '/(app)' : '/(auth)/login'} />;",
)
path.write_text(text)

path = Path("mobile/app/(app)/_layout.tsx")
text = path.read_text().replace(
    "  if (status !== 'authenticated') {\n    return <Redirect href=\"/(auth)/login\" />;\n  }",
    "  if (status === 'onboarding') return <Redirect href=\"/onboarding\" />;\n\n  if (status !== 'authenticated') {\n    return <Redirect href=\"/(auth)/login\" />;\n  }",
)
path.write_text(text)

Path("mobile/app/onboarding.tsx").write_text('''import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';

export default function OnboardingScreen() {
  const { status, session, signOut } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  if (status === 'authenticated') return <Redirect href="/(app)" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu perfil de barbero está listo</Text>
      <Text style={styles.body}>Hola {session?.user.name}. Aún no perteneces a una barbería. Pronto podrás aceptar invitaciones o solicitar ingreso desde aquí.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, gap: 18, backgroundColor: '#f7f7f5' },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  button: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
''')

# End-to-end API integration coverage.
Path("backend/tests/BarberTurn.Api.Tests/IndependentBarberRegistrationTests.cs").write_text('''using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class IndependentBarberRegistrationTests
{
    private readonly BarberTurnFactory factory;

    public IndependentBarberRegistrationTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task RegistrationCreatesOnboardingIdentityWithoutTenantClaims()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        var suffix = Guid.NewGuid().ToString("N")[..10];
        var email = $"barber-{suffix}@example.com";
        const string password = "ValidPass123!";
        var registration = await client.PostAsJsonAsync("/api/auth/register-barber", new
        {
            name = $"Barber {suffix}", email, password, acceptedTerms = true
        });
        registration.EnsureSuccessStatusCode();
        var payload = await registration.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(payload);
        Assert.Null(payload.BarberShopId);
        Assert.Null(payload.BarberId);
        Assert.Equal("Barber", payload.Role);
        Assert.Equal("Onboarding", payload.SessionScope);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(payload.AccessToken);
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type == "barbershop_id");
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase) || claim.Type == "role");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.AsNoTracking().SingleAsync(x => x.Email == email);
        Assert.Null(user.BarberShopId);
        Assert.Equal(UserRole.Barber, user.Role);
        Assert.True(await db.BarberProfiles.AnyAsync(x => x.UserId == user.Id));
        Assert.False(await db.ShopMemberships.AnyAsync(x => x.UserId == user.Id));

        using var tenantRequest = new HttpRequestMessage(HttpMethod.Get, "/api/queue");
        tenantRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", payload.AccessToken);
        var tenantResponse = await client.SendAsync(tenantRequest);
        Assert.Equal(HttpStatusCode.Forbidden, tenantResponse.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        login.EnsureSuccessStatusCode();
        var loginPayload = await login.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.Equal("Onboarding", loginPayload?.SessionScope);
        Assert.Null(loginPayload?.BarberShopId);
    }

    private sealed record AuthPayload(
        string AccessToken,
        Guid? BarberShopId,
        Guid? BarberId,
        string Role,
        bool IsEmailVerified,
        string SessionScope);
}
''')

# Document completed Stage C behavior.
path = Path("docs/identity-memberships.md")
text = path.read_text().replace(
    "### Etapa C — registro independiente\n\nNuevo flujo público:",
    "### Etapa C — registro independiente (implementada)\n\nNuevo flujo público:",
)
text = text.replace(
    "El registro crea `User + BarberProfile`, pero no crea una barbería ni una membresía falsa. La sesión queda en modo onboarding hasta que exista al menos una membresía activa.",
    "El registro crea `User + BarberProfile`, pero no crea una barbería ni una membresía falsa. `Users.BarberShopId` puede ser `NULL` durante onboarding. La sesión emite `SessionScope = Onboarding` y no incluye claims `barbershop_id`, `role` ni `barber_id` hasta que exista una membresía activa.",
)
path.write_text(text)
