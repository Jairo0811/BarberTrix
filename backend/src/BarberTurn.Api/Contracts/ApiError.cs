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
    public const string TeamInvalid = "TEAM_INVALID";
    public const string TeamOperationInvalid = "TEAM_OPERATION_INVALID";
    public const string QueueInvalid = "QUEUE_INVALID";
    public const string QueueConflict = "QUEUE_CONFLICT";
    public const string AppointmentInvalid = "APPOINTMENT_INVALID";
    public const string AppointmentConflict = "APPOINTMENT_CONFLICT";
    public const string PlanFeatureUnavailable = "PLAN_FEATURE_UNAVAILABLE";
    public const string ShopSettingsInvalid = "SHOP_SETTINGS_INVALID";
    public const string LocationInvalid = "LOCATION_INVALID";
    public const string CustomerInvalid = "CUSTOMER_INVALID";
    public const string CustomerAlreadyExists = "CUSTOMER_ALREADY_EXISTS";
    public const string PaymentInvalid = "PAYMENT_INVALID";
    public const string BillingInvalid = "BILLING_INVALID";
    public const string BillingWebhookInvalid = "BILLING_WEBHOOK_INVALID";
    public const string DemoFeatureUnavailable = "DEMO_FEATURE_UNAVAILABLE";
}

public sealed record ApiError(string Code, string Message, string? CorrelationId = null)
{
    public static ApiError From(HttpContext context, string code, string message) =>
        new(code, message, context.TraceIdentifier);
}

public static class ApiErrorResults
{
    public static IResult BadRequest(HttpContext context, string code, string message) =>
        Results.BadRequest(ApiError.From(context, code, message));

    public static IResult Conflict(HttpContext context, string code, string message) =>
        Results.Conflict(ApiError.From(context, code, message));

    public static IResult Forbidden(HttpContext context, string code, string message) =>
        Results.Json(ApiError.From(context, code, message), statusCode: StatusCodes.Status403Forbidden);

    public static IResult Unauthorized(HttpContext context, string code, string message) =>
        Results.Json(ApiError.From(context, code, message), statusCode: StatusCodes.Status401Unauthorized);
}
