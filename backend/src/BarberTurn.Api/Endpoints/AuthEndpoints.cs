using BarberTurn.Application.Auth;

namespace BarberTurn.Api.Endpoints;

public static class AuthEndpoints
{
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

        return endpoints;
    }
}
