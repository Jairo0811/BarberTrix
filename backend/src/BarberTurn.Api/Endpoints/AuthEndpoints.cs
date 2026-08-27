using System.Security.Claims;
using BarberTurn.Api.Contracts;
using BarberTurn.Api.Filters;
using BarberTurn.Application.Auth;

namespace BarberTurn.Api.Endpoints;

public static class AuthEndpoints
{
    private const string PasswordResetMessage = "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.";
    private const string RefreshCookieName = "barberturn.refresh";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/register-owner", async (RegisterOwnerRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await authService.RegisterOwnerAsync(request, UserAgent(context), Ip(context), cancellationToken);
                WriteRefreshCookie(context, response);
                return Results.Ok(ToClientResponse(response));
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(ApiError.From(context, ApiErrorCodes.AuthRegistrationConflict, ex.Message));
            }
            catch (Exception ex) when (ex is ArgumentException or TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return Results.BadRequest(ApiError.From(context, ApiErrorCodes.AuthRegistrationInvalid, ex.Message));
            }
        }).RequireRateLimiting("registration");

        group.MapPost("/login", async (LoginRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var response = await authService.LoginAsync(request, UserAgent(context), Ip(context), cancellationToken);
            if (response is null)
                return Results.Json(ApiError.From(context, ApiErrorCodes.AuthInvalidCredentials, "Correo o contraseña incorrectos."), statusCode: StatusCodes.Status401Unauthorized);

            WriteRefreshCookie(context, response);
            return Results.Ok(ToClientResponse(response));
        }).RequireRateLimiting("auth");

        group.MapPost("/refresh", async (HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            if (!context.Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
                return Results.Json(ApiError.From(context, ApiErrorCodes.AuthRefreshRequired, "La sesión debe renovarse."), statusCode: StatusCodes.Status401Unauthorized);

            var response = await authService.RefreshAsync(new RefreshTokenRequest(refreshToken), UserAgent(context), Ip(context), cancellationToken);
            if (response is null)
            {
                DeleteRefreshCookie(context);
                return Results.Json(ApiError.From(context, ApiErrorCodes.AuthRefreshInvalid, "La sesión ya no es válida."), statusCode: StatusCodes.Status401Unauthorized);
            }

            WriteRefreshCookie(context, response);
            return Results.Ok(ToClientResponse(response));
        }).RequireRateLimiting("auth");

        group.MapPost("/logout", async (HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            if (context.Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
                await authService.LogoutAsync(new LogoutRequest(refreshToken), cancellationToken);
            DeleteRefreshCookie(context);
            return Results.NoContent();
        }).RequireRateLimiting("auth");

        group.MapPost("/demo-login", async (HttpContext context, IAuthService authService, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            if (!configuration.GetValue<bool>("Demo:Enabled")) return Results.NotFound();
            var response = await authService.CreateDemoSessionAsync(UserAgent(context), Ip(context), cancellationToken);
            WriteRefreshCookie(context, response);
            return Results.Ok(ToClientResponse(response));
        }).RequireRateLimiting("auth");

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, HttpContext context, IAuthService authService, IConfiguration configuration, IHostEnvironment environment, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return Results.BadRequest(ApiError.From(context, ApiErrorCodes.AuthEmailRequired, "El correo electrónico es obligatorio."));

            var token = await authService.CreatePasswordResetTokenAsync(request, cancellationToken);
            string? developmentResetUrl = null;
            if (environment.IsDevelopment() && configuration.GetValue("Email:ExposeDevelopmentLinks", true) && token is not null)
            {
                var frontendBaseUrl = configuration["PasswordReset:FrontendBaseUrl"] ?? "http://localhost:5173";
                developmentResetUrl = $"{frontendBaseUrl.TrimEnd('/')}/#/reset-password?token={Uri.EscapeDataString(token)}";
            }
            return Results.Ok(new ForgotPasswordResponse(PasswordResetMessage, developmentResetUrl));
        }).RequireRateLimiting("auth");

        group.MapPost("/reset-password", async (ResetPasswordRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var changed = await authService.ResetPasswordAsync(request, cancellationToken);
            return changed
                ? Results.Ok(new { message = "Tu contraseña se actualizó correctamente." })
                : Results.BadRequest(ApiError.From(context, ApiErrorCodes.AuthPasswordResetInvalid, "El enlace o la contraseña no son válidos."));
        }).RequireRateLimiting("auth");

        group.MapPost("/verify-email", async (VerifyEmailRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
            await authService.VerifyEmailAsync(request, cancellationToken)
                ? Results.Ok(new { message = "Correo verificado." })
                : Results.BadRequest(ApiError.From(context, ApiErrorCodes.AuthEmailVerificationInvalid, "El enlace es inválido o expiró.")))
            .RequireRateLimiting("auth");

        group.MapPost("/send-verification", async (HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var userId = GetUserId(context);
            return await authService.SendEmailVerificationAsync(userId, cancellationToken) ? Results.Accepted() : Results.NoContent();
        }).RequireAuthorization().RequireRateLimiting("auth");

        group.MapPost("/accept-invitation", async (AcceptInvitationRequest request, HttpContext context, IAuthService authService, CancellationToken cancellationToken) =>
        {
            try
            {
                var response = await authService.AcceptInvitationAsync(request, UserAgent(context), Ip(context), cancellationToken);
                WriteRefreshCookie(context, response);
                return Results.Ok(ToClientResponse(response));
            }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return Results.BadRequest(ApiError.From(context, ApiErrorCodes.AuthInvitationInvalid, ex.Message));
            }
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
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException) { return ApiErrorResults.BadRequest(context, ApiErrorCodes.TeamInvalid, ex.Message); }
        }).RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"));
        team.MapDelete("/{userId:guid}", async (Guid userId, HttpContext context, IAuthService service, CancellationToken ct) =>
            await service.DeactivateTeamMemberAsync(GetShopId(context), userId, ct)
                ? Results.NoContent()
                : ApiErrorResults.BadRequest(context, ApiErrorCodes.TeamOperationInvalid, "The team member could not be deactivated."))
            .RequireAuthorization(policy => policy.RequireRole("Owner"));

        return endpoints;
    }

    private static AuthSessionResponse ToClientResponse(AuthResponse response) => new(
        response.AccessToken,
        response.ExpiresAtUtc,
        response.UserId,
        response.BarberShopId,
        response.BarberId,
        response.Name,
        response.Role,
        response.IsEmailVerified);

    private static void WriteRefreshCookie(HttpContext context, AuthResponse response)
    {
        context.Response.Cookies.Append(RefreshCookieName, response.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = response.RefreshTokenExpiresAtUtc,
            IsEssential = true
        });
    }

    private static void DeleteRefreshCookie(HttpContext context) =>
        context.Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth"
        });

    private static string? UserAgent(HttpContext context) => context.Request.Headers.UserAgent.ToString();
    private static string? Ip(HttpContext context) => context.Connection.RemoteIpAddress?.ToString();
    private static Guid GetUserId(HttpContext context) => Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"), out var id) ? id : throw new InvalidOperationException("Invalid user context.");
    private static Guid GetShopId(HttpContext context) => Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var id) ? id : throw new InvalidOperationException("Invalid barbershop context.");

    private sealed record AuthSessionResponse(
        string AccessToken,
        DateTimeOffset ExpiresAtUtc,
        Guid UserId,
        Guid BarberShopId,
        Guid? BarberId,
        string Name,
        string Role,
        bool IsEmailVerified);
}
