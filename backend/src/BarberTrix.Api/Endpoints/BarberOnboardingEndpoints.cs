using BarberTrix.Application.Common;
using System.Security.Claims;
using BarberTrix.Api.Contracts;
using BarberTrix.Api.Filters;
using BarberTrix.Application.Onboarding;

namespace BarberTrix.Api.Endpoints;

public static class BarberOnboardingEndpoints
{
    public static IEndpointRouteBuilder MapBarberOnboardingEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var onboarding = endpoints.MapGroup("/api/onboarding")
            .WithTags("Barber onboarding")
            .RequireAuthorization("OnboardingUser");

        onboarding.MapGet("/shops", async (string? query, IBarberOnboardingService service, CancellationToken ct) =>
            Results.Ok(await service.SearchShopsAsync(query, ct)));

        onboarding.MapGet("/join-requests", async (HttpContext context, IBarberOnboardingService service, CancellationToken ct) =>
            Results.Ok(await service.GetMyJoinRequestsAsync(GetUserId(context), ct)));

        onboarding.MapPost("/join-requests/{barberShopId:guid}", async (Guid barberShopId, HttpContext context, IBarberOnboardingService service, CancellationToken ct) =>
        {
            try
            {
                return Results.Created($"/api/onboarding/join-requests/{barberShopId}", await service.RequestJoinAsync(GetUserId(context), barberShopId, ct));
            }
            catch (BusinessRuleException ex) { return ApiErrorResults.Conflict(context, ex.Code, ex.Message); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, "ONBOARDING_JOIN_INVALID", ex.Message);
            }
        });

        onboarding.MapDelete("/join-requests/{requestId:guid}", async (Guid requestId, HttpContext context, IBarberOnboardingService service, CancellationToken ct) =>
            await service.WithdrawJoinRequestAsync(GetUserId(context), requestId, ct)
                ? Results.NoContent()
                : ApiErrorResults.BadRequest(context, "ONBOARDING_JOIN_INVALID", "The join request could not be withdrawn."));

        var team = endpoints.MapGroup("/api/team/join-requests")
            .WithTags("Team")
            .RequireAuthorization("TenantUser")
            .RequireAuthorization(policy => policy.RequireRole("Owner", "Administrator"))
            .AddEndpointFilter<NonDemoTenantFilter>();

        team.MapGet("/", async (HttpContext context, IBarberOnboardingService service, CancellationToken ct) =>
            Results.Ok(await service.GetPendingJoinRequestsAsync(GetShopId(context), ct)));

        team.MapPost("/{requestId:guid}/approve", async (Guid requestId, ApproveBarberJoinRequestRequest request, HttpContext context, IBarberOnboardingService service, CancellationToken ct) =>
        {
            try
            {
                return await service.ApproveJoinRequestAsync(GetShopId(context), GetUserId(context), requestId, request.ChairNumber, ct)
                    ? Results.NoContent()
                    : ApiErrorResults.BadRequest(context, "TEAM_JOIN_REQUEST_INVALID", "The join request could not be approved.");
            }
            catch (BusinessRuleException ex) { return ApiErrorResults.Conflict(context, ex.Code, ex.Message); }
            catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
            {
                return ApiErrorResults.BadRequest(context, "TEAM_JOIN_REQUEST_INVALID", ex.Message);
            }
        });

        team.MapPost("/{requestId:guid}/reject", async (Guid requestId, RejectBarberJoinRequestRequest request, HttpContext context, IBarberOnboardingService service, CancellationToken ct) =>
            await service.RejectJoinRequestAsync(GetShopId(context), GetUserId(context), requestId, request.Note, ct)
                ? Results.NoContent()
                : ApiErrorResults.BadRequest(context, "TEAM_JOIN_REQUEST_INVALID", "The join request could not be rejected."));

        return endpoints;
    }

    private static Guid GetUserId(HttpContext context) =>
        Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"), out var id)
            ? id
            : throw new InvalidOperationException("Invalid user context.");

    private static Guid GetShopId(HttpContext context) =>
        Guid.TryParse(context.User.FindFirstValue("barbershop_id"), out var id)
            ? id
            : throw new InvalidOperationException("Invalid barbershop context.");
}
