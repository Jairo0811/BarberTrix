using System.Security.Claims;
using BarberTurn.Api.Filters;
using BarberTurn.Application.Auth;

namespace BarberTurn.Api.Endpoints;

public static class AuthEndpoints
{
    private const string PasswordResetMessage = "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/register-owner", async (RegisterOwnerRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await authService.RegisterOwnerAsync(request, UserAgent(context), Ip(context), cancellationToken);
                return Results.Ok(response);
            }
            catch (InvalidOperationException ex) { return Results.Conflict(new { message = ex.Message }); }
            catch (Exception ex) when (ex is ArgumentException or TimeZoneNotFoundException or InvalidTimeZoneException)
            { return Results.ValidationProblem(new Dictionary<string, string[]> { ["registration"] = [ex.Message] }); }
        }).RequireRateLimiting("registration");

        group.MapPost("/login", async (LoginRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var response = await authService.LoginAsync(request, UserAgent(context), Ip(context), cancellationToken);
            return response is null ? Results.Unauthorized() : Results.Ok(response);
        }).RequireRateLimiting("auth");

        group.MapPost("/refresh", async (RefreshTokenRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var response = await authService.RefreshAsync(request, UserAgent(context), Ip(context), cancellationToken);
            return response is null ? Results.Unauthorized() : Results.Ok(response);
        }).RequireRateLimiting("auth");

        group.MapPost("/logout", async (LogoutRequest request, IAuthService authService, CancellationToken cancellationToken) =>
        {
            await authService.LogoutAsync(request, cancellationToken);
            return Results.NoContent();
        }).RequireRateLimiting("auth");

        group.MapPost("/demo-login", async (HttpContext context, IAuthService authService, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            if (!configuration.GetValue<bool>("Demo:Enabled")) return Results.NotFound();
            return Results.Ok(await authService.CreateDemoSessionAsync(UserAgent(context), Ip(context), cancellationToken));
        }).RequireRateLimiting("auth");

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, IAuthService authService, IConfiguration configuration, IHostEnvironment environment, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["email"] = ["El correo electrónico es obligatorio."] });
            var token = await authService.CreatePasswordResetTokenAsync(request, cancellationToken);
            string? developmentResetUrl = null;
            if (environment.IsDevelopment() && configuration.GetValue("Email:ExposeDevelopmentLinks", true) && token is not null)
            {
                var frontendBaseUrl = configuration["PasswordReset:FrontendBaseUrl"] ?? "http://localhost:5173";
                developmentResetUrl = $"{frontendBaseUrl.TrimEnd('/')}/#/reset-password?token={Uri.EscapeDataString(token)}";
            }
            return Results.Ok(new ForgotPasswordResponse(PasswordResetMessage, developmentResetUrl));
        }).RequireRateLimiting("auth");

        group.MapPost("/reset-password", async (ResetPasswordRequest request, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var changed = await authService.ResetPasswordAsync(request, cancellationToken);
            return changed ? Results.Ok(new { message = "Tu contraseña se actualizó correctamente." })
                : Results.ValidationProblem(new Dictionary<string, string[]> { ["token"] = ["El enlace o la contraseña no son válidos."] });
        }).RequireRateLimiting("auth");

        group.MapPost("/verify-email", async (VerifyEmailRequest request, IAuthService authService, CancellationToken cancellationToken) =>
            await authService.VerifyEmailAsync(request, cancellationToken) ? Results.Ok(new { message = "Correo verificado." }) : Results.BadRequest(new { message = "El enlace es inválido o expiró." }))
            .RequireRateLimiting("auth");

        group.MapPost("/send-verification", async (HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(context);
            return await authService.SendEmailVerificationAsync(userId, cancellationToken) ? Results.Accepted() : Results.NoContent();
        }).RequireAuthorization().RequireRateLimiting("auth");

        group.MapPost("/accept-invitation", async (AcceptInvitationRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            try { return Results.Ok(await authService.AcceptInvitationAsync(request, UserAgent(context), Ip(context), cancellationToken)); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
        }).RequireRateLimiting("registration");

        var team = endpoints.MapGroup("/api/team").WithTags("Team").RequireAuthorization("VerifiedUser").AddEndpointFilter<NonDemoTenantFilter>();
        team.MapGet("/", async (HttpContext context, IAuthService service, CancellationToken ct) => Results.Ok(await service.GetTeamAsync(GetShopId(context), ct)))
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        team.MapPost("/invitations", async (CreateInvitationRequest request, HttpContext context, IAuthService service, IConfiguration config, IHostEnvironment environment, CancellationToken ct) =>
        {
            try
            {
                var frontend = config["PasswordReset:FrontendBaseUrl"] ?? "http://localhost:5173";
                return Results.Created("/api/team/invitations", await service.CreateInvitationAsync(GetShopId(context), request, frontend, environment.IsDevelopment(), ct));
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return Results.BadRequest(new { message = ex.Message }); }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        team.MapDelete("/{userId:guid}", async (Guid userId, HttpContext context, IAuthService service, CancellationToken ct) =>
            await service.DeactivateTeamMemberAsync(GetShopId(context), userId, ct) ? Results.NoContent() : Results.BadRequest())
            .RequireAuthorization(policy => policy.RequireRole("Owner"));

        return endpoints;
    }

    private static string? UserAgent(HttpContext context) => context.Request.Headers.UserAgent.ToString();
    private static string? Ip(HttpContext context) => context.Connection.RemoteIpAddress?.ToString();
    private static Guid GetUserId(HttpContext context) => Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"), out var id) ? id : throw new InvalidOperationException("Invalid user context.");
    private static Guid GetShopId(HttpContext context) => Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");
}
