using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace BarberTurn.Api.Middleware;

public sealed class RequestTelemetryMiddleware(RequestDelegate next, ILogger<RequestTelemetryMiddleware> logger)
{
    private static readonly Action<ILogger, string, string?, int, double, Exception?> RequestCompleted =
        LoggerMessage.Define<string, string?, int, double>(
            LogLevel.Information,
            new EventId(1001, nameof(RequestCompleted)),
            "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds} ms");

    private static readonly Action<ILogger, string, string?, double, Exception?> RequestFailed =
        LoggerMessage.Define<string, string?, double>(
            LogLevel.Error,
            new EventId(1002, nameof(RequestFailed)),
            "Unhandled exception for HTTP {Method} {Path} after {ElapsedMilliseconds} ms");

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var tenantId = context.User.FindFirst("barbershop_id")?.Value;
        var userId = context.User.FindFirst("sub")?.Value
            ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        using var scope = logger.BeginScope(new Dictionary<string, object?>
        {
            ["CorrelationId"] = context.TraceIdentifier,
            ["TenantId"] = tenantId,
            ["UserId"] = userId,
            ["RequestMethod"] = context.Request.Method,
            ["RequestPath"] = context.Request.Path.Value
        });

        try
        {
            await next(context);
            stopwatch.Stop();

            RequestCompleted(
                logger,
                context.Request.Method,
                context.Request.Path.Value,
                context.Response.StatusCode,
                stopwatch.Elapsed.TotalMilliseconds,
                null);
        }
        catch (Exception exception)
        {
            stopwatch.Stop();

            RequestFailed(
                logger,
                context.Request.Method,
                context.Request.Path.Value,
                stopwatch.Elapsed.TotalMilliseconds,
                exception);

            throw;
        }
    }
}
