using BarberTurn.Application.Auth;

namespace BarberTurn.Api.Endpoints;

public static class AuthEndpoints
{
    private const string PasswordResetMessage = "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer tu contraseña.";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/register-owner", async (RegisterOwnerRequest request, IAuthService authService, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["credentials"] = ["Email and a password of at least 8 characters are required."] });

            try
            {
                var response = await authService.RegisterOwnerAsync(request, cancellationToken);
                return Results.Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        });

        group.MapPost("/login", async (LoginRequest request, IAuthService authService, CancellationToken cancellationToken) =>
        {
            var response = await authService.LoginAsync(request, cancellationToken);
            return response is null ? Results.Unauthorized() : Results.Ok(response);
        });

        group.MapPost("/demo-login", async (
            IAuthService authService,
            IConfiguration configuration,
            IHostEnvironment environment,
            CancellationToken cancellationToken) =>
        {
            if (!environment.IsDevelopment() || !configuration.GetValue<bool>("DemoAdmin:Enabled"))
                return Results.NotFound();

            var email = configuration["DemoAdmin:Email"];
            var password = configuration["DemoAdmin:Password"];

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                return Results.Problem(
                    "El usuario demo no está configurado.",
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            var response = await authService.LoginAsync(new LoginRequest(email, password), cancellationToken);

            return response is null
                ? Results.Problem(
                    "No se pudo iniciar la sesión demo.",
                    statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(response);
        });

        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest request,
            IAuthService authService,
            IConfiguration configuration,
            IHostEnvironment environment,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["email"] = ["El correo electrónico es obligatorio."] });

            var token = await authService.CreatePasswordResetTokenAsync(request, cancellationToken);
            string? developmentResetUrl = null;

            if (environment.IsDevelopment() && token is not null)
            {
                var frontendBaseUrl = configuration["PasswordReset:FrontendBaseUrl"] ?? "http://localhost:5173";
                developmentResetUrl = $"{frontendBaseUrl.TrimEnd('/')}/#/reset-password?token={Uri.EscapeDataString(token)}";
            }

            return Results.Ok(new ForgotPasswordResponse(PasswordResetMessage, developmentResetUrl));
        });

        group.MapPost("/reset-password", async (ResetPasswordRequest request, IAuthService authService, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["credentials"] = ["Se requiere un token válido y una contraseña de al menos 8 caracteres."] });

            var changed = await authService.ResetPasswordAsync(request, cancellationToken);
            return changed
                ? Results.Ok(new { message = "Tu contraseña se actualizó correctamente." })
                : Results.ValidationProblem(new Dictionary<string, string[]> { ["token"] = ["El enlace de recuperación es inválido, ya fue utilizado o expiró."] });
        });

        return endpoints;
    }
}
