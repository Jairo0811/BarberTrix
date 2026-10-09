using System.Net;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BarberTrix.Api.Endpoints;
using BarberTrix.Api.Health;
using BarberTrix.Api.Middleware;
using BarberTrix.Api.Realtime;
using BarberTrix.Application.Common;
using BarberTrix.Infrastructure;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);
var isTesting = builder.Environment.IsEnvironment("Testing");

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);
builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<IQueueNotifier, SignalRQueueNotifier>();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;

    var trustAnyProxy = builder.Configuration.GetValue<bool>("ReverseProxy:TrustAnyProxy");
    if (trustAnyProxy)
    {
        // Only enable this when the API is reachable exclusively through a trusted edge proxy.
        // docker-compose.production.yml keeps the API internal and exposes only nginx.
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        return;
    }

    var knownNetworks = builder.Configuration.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? [];
    var knownProxies = builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [];

    // If an explicit allowlist is configured, make it authoritative instead of
    // silently retaining the framework's loopback defaults alongside it.
    if (knownNetworks.Length > 0 || knownProxies.Length > 0)
    {
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    }

    foreach (var cidr in knownNetworks)
    {
        if (!System.Net.IPNetwork.TryParse(cidr, out var network))
            throw new InvalidOperationException($"ReverseProxy:KnownNetworks contains an invalid CIDR: '{cidr}'.");
        options.KnownIPNetworks.Add(network);
    }

    foreach (var value in knownProxies)
    {
        if (!IPAddress.TryParse(value, out var proxy))
            throw new InvalidOperationException($"ReverseProxy:KnownProxies contains an invalid IP address: '{value}'.");
        options.KnownProxies.Add(proxy);
    }
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = isTesting ? 1000 : 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("registration", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = isTesting ? 1000 : 5, Window = TimeSpan.FromHours(1), QueueLimit = 0 }));
    options.AddPolicy("publicQueue", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = isTesting ? 1000 : 60, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("tvPairing", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = isTesting ? 1000 : 12, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("webhooks", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = isTesting ? 1000 : 120, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("invitations", context => RateLimitPartition.GetFixedWindowLimiter(
        $"{context.User.FindFirst("barbershop_id")?.Value}:{context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? context.User.FindFirst("sub")?.Value ?? context.Connection.RemoteIpAddress?.ToString()}",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = isTesting ? 1000 : 30, Window = TimeSpan.FromHours(1), QueueLimit = 0 }));
});
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

if (builder.Configuration.GetValue<bool>("Database:ApplyMigrations"))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();
}

if (builder.Configuration.GetValue<bool>("Database:MigrationOnly"))
    return;

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DevelopmentDataSeeder>();
    await seeder.SeedAsync();
}

app.UseForwardedHeaders();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment()) app.UseHsts();
if (!app.Environment.IsEnvironment("Testing")) app.UseHttpsRedirection();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    await next();
});
app.UseCors("frontend");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.UseMiddleware<RequestTelemetryMiddleware>();
app.UseMiddleware<AuditMiddleware>();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });
app.MapGet("/api", () => Results.Ok(new { name = "BarberTrix API", status = "ok" }));
if (isTesting)
    app.MapGet("/__tests/edge", (HttpContext context) => Results.Ok(new { remoteIp = context.Connection.RemoteIpAddress?.ToString(), scheme = context.Request.Scheme }));
app.MapAuthEndpoints();
app.MapBarberOnboardingEndpoints();
app.MapQueueEndpoints();
app.MapTodayEndpoints();
app.MapAppointmentEndpoints();
app.MapTurnRequestEndpoints();
app.MapDiscoveryEndpoints();
app.MapPushEndpoints();
app.MapTvEndpoints();
app.MapCommercialEndpoints();
app.MapCustomerCrmEndpoints();
app.MapCashEndpoints();
app.MapHub<QueueHub>("/hubs/queue");

app.Run();
