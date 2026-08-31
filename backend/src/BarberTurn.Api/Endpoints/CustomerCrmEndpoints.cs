using System.Security.Claims;
using BarberTurn.Api.Filters;
using BarberTurn.Application.Commercial;

namespace BarberTurn.Api.Endpoints;

public static class CustomerCrmEndpoints
{
    public static IEndpointRouteBuilder MapCustomerCrmEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var customers = endpoints.MapGroup("/api/customers")
            .WithTags("Customers")
            .RequireAuthorization("VerifiedUser")
            .AddEndpointFilter<NonDemoTenantFilter>();

        customers.MapGet("/{id:guid}/profile", async (
            Guid id,
            HttpContext context,
            ICommercialService service,
            CancellationToken ct) =>
        {
            var profile = await service.GetCustomerDetailAsync(ShopId(context), id, ct);
            return profile is null ? Results.NotFound() : Results.Ok(profile);
        });

        customers.MapPut("/{id:guid}/notes", async (
            Guid id,
            UpdateCustomerNoteRequest request,
            HttpContext context,
            ICommercialService service,
            CancellationToken ct) =>
        {
            try
            {
                var updated = await service.UpdateCustomerNoteAsync(ShopId(context), id, UserId(context), request.Notes, ct);
                return updated ? Results.NoContent() : Results.NotFound();
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        return endpoints;
    }

    private static Guid ShopId(HttpContext context) =>
        Guid.TryParse(context.User.FindFirst("barbershop_id")?.Value, out var id)
            ? id
            : throw new InvalidOperationException("Invalid barbershop context.");

    private static Guid? UserId(HttpContext context)
    {
        var value = context.User.FindFirst("sub")?.Value
            ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
