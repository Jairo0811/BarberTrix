using System.Security.Claims;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Api.Filters;

public sealed class NonDemoTenantFilter(ApplicationDbContext dbContext) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        if (!Guid.TryParse(httpContext.User.FindFirstValue("barbershop_id"), out var shopId))
            return Results.Unauthorized();

        var isDemo = await dbContext.BarberShops
            .AsNoTracking()
            .Where(x => x.Id == shopId)
            .Select(x => x.Slug.StartsWith("demo-"))
            .SingleOrDefaultAsync(httpContext.RequestAborted);

        if (isDemo)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Función no disponible en la demostración",
                detail: "Esta función está reservada para cuentas reales de BarberTurn.");
        }

        return await next(context);
    }
}
