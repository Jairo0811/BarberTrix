using System.Security.Claims;
using BarberTurn.Application.Common;

namespace BarberTurn.Api.Middleware;

public sealed class AuditMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        await next(context);
        if (context.Response.StatusCode >= 400 || context.Request.Method is "GET" or "HEAD" or "OPTIONS")
            return;
        if (!Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var shopId))
            return;
        Guid? userId = Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"), out var parsedUser) ? parsedUser : null;
        await auditService.WriteAsync(shopId, userId, $"{context.Request.Method} {context.Request.Path}", "HttpRequest", null, null, context.Connection.RemoteIpAddress?.ToString(), context.RequestAborted);
    }
}
