using System.Security.Claims;
using BarberTrix.Application.Common;
using Microsoft.Extensions.Logging;

namespace BarberTrix.Api.Middleware;

public sealed class AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
{
    private static readonly Action<ILogger, string, string?, Exception?> LogAuditWriteFailed =
        LoggerMessage.Define<string, string?>(
            LogLevel.Warning,
            new EventId(1201, "AuditWriteFailed"),
            "Audit persistence failed for HTTP {Method} {Path}; the primary request result is preserved");

    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        await next(context);
        if (context.Response.StatusCode >= 400 || context.Request.Method is "GET" or "HEAD" or "OPTIONS")
            return;
        if (!Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var shopId))
            return;

        Guid? userId = Guid.TryParse(
            context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"),
            out var parsedUser)
            ? parsedUser
            : null;

        try
        {
            using var auditTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            await auditService.WriteAsync(
                shopId,
                userId,
                $"{context.Request.Method} {context.Request.Path}",
                "HttpRequest",
                null,
                null,
                context.Connection.RemoteIpAddress?.ToString(),
                auditTimeout.Token);
        }
        catch (Exception exception) when (exception is OperationCanceledException or InvalidOperationException)
        {
            LogAuditWriteFailed(logger, context.Request.Method, context.Request.Path.Value, exception);
        }
    }
}
