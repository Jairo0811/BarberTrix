namespace BarberTrix.Application.Common;

public static class ApplicationErrorCodes
{
    public const string CustomerAlreadyExists = "CUSTOMER_ALREADY_EXISTS";
    public const string AppointmentTimeUnavailable = "APPOINTMENT_TIME_UNAVAILABLE";
}

public sealed class BusinessRuleException(string code, string message) : InvalidOperationException(message)
{
    public string Code { get; } = code;
}
