namespace BarberTurn.Application.Common;

public static class ApplicationErrorCodes
{
    public const string CustomerAlreadyExists = "CUSTOMER_ALREADY_EXISTS";
}

public sealed class BusinessRuleException(string code, string message) : InvalidOperationException(message)
{
    public string Code { get; } = code;
}
