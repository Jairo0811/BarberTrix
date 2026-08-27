namespace BarberTurn.Api.Contracts;

public static class ApiErrorCodes
{
    public const string AuthInvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string AuthRefreshRequired = "AUTH_REFRESH_REQUIRED";
    public const string AuthRefreshInvalid = "AUTH_REFRESH_INVALID";
    public const string AuthRegistrationConflict = "AUTH_REGISTRATION_CONFLICT";
    public const string AuthRegistrationInvalid = "AUTH_REGISTRATION_INVALID";
    public const string AuthEmailRequired = "AUTH_EMAIL_REQUIRED";
    public const string AuthPasswordResetInvalid = "AUTH_PASSWORD_RESET_INVALID";
    public const string AuthEmailVerificationInvalid = "AUTH_EMAIL_VERIFICATION_INVALID";
    public const string AuthInvitationInvalid = "AUTH_INVITATION_INVALID";
}

public sealed record ApiError(string Code, string Message, string? CorrelationId = null)
{
    public static ApiError From(HttpContext context, string code, string message) =>
        new(code, message, context.TraceIdentifier);
}
