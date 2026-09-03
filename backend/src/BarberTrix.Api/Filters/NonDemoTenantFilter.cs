using System.Security.Claims;
using BarberTrix.Api.Contracts;
using BarberTrix.Application.Common;

namespace BarberTrix.Api.Filters;

public sealed class NonDemoTenantFilter(IPlanLimitService planLimits) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        if (!Guid.TryParse(httpContext.User.FindFirstValue("barbershop_id"), out var shopId))
            return ApiErrorResults.Unauthorized(httpContext, ApiErrorCodes.TenantContextInvalid, "The tenant context is invalid.");

        var usage = await planLimits.GetUsageAsync(shopId, httpContext.RequestAborted);
        if (usage.IsDemo)
        {
            return ApiErrorResults.Forbidden(
                httpContext,
                ApiErrorCodes.DemoFeatureUnavailable,
                "This feature is reserved for real BarberTrix accounts.");
        }

        return await next(context);
    }
}
