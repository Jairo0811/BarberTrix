using System.Text;
using BarberTurn.Application.Auth;
using BarberTurn.Application.Appointments;
using BarberTurn.Application.Cash;
using BarberTurn.Application.Commercial;
using BarberTurn.Application.Common;
using BarberTurn.Application.Queue;
using BarberTurn.Application.Push;
using BarberTurn.Application.TurnRequests;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Auth;
using BarberTurn.Infrastructure.Appointments;
using BarberTurn.Infrastructure.Cash;
using BarberTurn.Infrastructure.Commercial;
using BarberTurn.Infrastructure.Common;
using BarberTurn.Infrastructure.Persistence;
using BarberTurn.Infrastructure.Queue;
using BarberTurn.Infrastructure.Push;
using BarberTurn.Infrastructure.TurnRequests;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BarberTurn.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured at runtime.");

        var jwtKey = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be configured at runtime with at least 32 characters.");

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IQueueService, QueueService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<ITurnRequestService, TurnRequestService>();
        services.AddScoped<IPushSubscriptionService, PushSubscriptionService>();
        services.AddScoped<ITurnRequestPushNotifier, TurnRequestPushNotifier>();
        services.AddScoped<PushDeliveryProcessor>();
        services.AddScoped<ICommercialService, CommercialService>();
        services.AddScoped<ICashManagementService, CashManagementService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IPlanLimitService, PlanLimitService>();
        services.AddScoped<IShopLookupService, ShopLookupService>();
        services.AddScoped<IEmailSender, ConfigurableEmailSender>();
        services.AddHttpClient<IHumanVerificationService, HumanVerificationService>();
        services.AddHttpClient<IBillingService, PayPalBillingService>();
        services.AddHttpClient<IExpoPushGateway, ExpoPushGateway>();
        if (configuration.GetValue<bool>("Push:Enabled"))
            services.AddHostedService<PushDeliveryWorker>();
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<DevelopmentDataSeeder>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"] ?? "BarberTurn.Api",
                    ValidAudience = configuration["Jwt:Audience"] ?? "BarberTurn.Web",
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs/queue"))
                            context.Token = accessToken;
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = async context =>
                    {
                        var userIdValue = context.Principal?.FindFirst("sub")?.Value
                            ?? context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                        var securityStamp = context.Principal?.FindFirst("security_stamp")?.Value;
                        if (!Guid.TryParse(userIdValue, out var userId) || string.IsNullOrWhiteSpace(securityStamp))
                        {
                            context.Fail("Invalid session.");
                            return;
                        }

                        var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
                        var user = await db.Users.AsNoTracking()
                            .Where(x => x.Id == userId && x.IsActive && x.SecurityStamp == securityStamp)
                            .Select(x => new { x.Email })
                            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);
                        if (user is null)
                        {
                            context.Fail("Session revoked.");
                            return;
                        }

                        var systemAdminEmail = configuration["SystemAdmin:Email"] ?? configuration["DemoAdmin:Email"];
                        if (!string.IsNullOrWhiteSpace(systemAdminEmail)
                            && string.Equals(user.Email, systemAdminEmail.Trim(), StringComparison.OrdinalIgnoreCase)
                            && context.Principal?.Identity is System.Security.Claims.ClaimsIdentity identity
                            && !context.Principal.IsInRole(UserRole.Owner.ToString()))
                        {
                            identity.AddClaim(new System.Security.Claims.Claim(
                                System.Security.Claims.ClaimTypes.Role,
                                UserRole.Owner.ToString()));
                        }
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("VerifiedUser", policy =>
                policy.RequireAuthenticatedUser().RequireClaim("email_verified", "true"));
            options.AddPolicy("TenantUser", policy =>
                policy.RequireAuthenticatedUser()
                    .RequireClaim("email_verified", "true")
                    .RequireClaim("barbershop_id")
                    .RequireClaim(System.Security.Claims.ClaimTypes.Role));
        });
        return services;
    }
}
