from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f'Marker missing in {path}: {old[:80]!r}')
    target.write_text(text.replace(old, new, 1))


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


write('backend/src/BarberTurn.Domain/Entities/OnboardingEntities.cs', '''namespace BarberTurn.Domain.Entities;

public enum BarberJoinRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Withdrawn = 4
}

public sealed class BarberJoinRequest : BaseEntity
{
    private BarberJoinRequest() { }

    public BarberJoinRequest(Guid userId, Guid barberShopId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("User is required.", nameof(userId));
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));

        UserId = userId;
        BarberShopId = barberShopId;
        Status = BarberJoinRequestStatus.Pending;
    }

    public Guid UserId { get; private set; }
    public Guid BarberShopId { get; private set; }
    public BarberJoinRequestStatus Status { get; private set; }
    public Guid? ReviewedByUserId { get; private set; }
    public DateTimeOffset? ReviewedAtUtc { get; private set; }
    public string? ReviewNote { get; private set; }

    public void Reopen()
    {
        if (Status == BarberJoinRequestStatus.Approved)
            throw new InvalidOperationException("An approved request cannot be reopened.");
        Status = BarberJoinRequestStatus.Pending;
        ReviewedByUserId = null;
        ReviewedAtUtc = null;
        ReviewNote = null;
        Touch();
    }

    public void Approve(Guid reviewerUserId)
    {
        EnsurePending();
        if (reviewerUserId == Guid.Empty)
            throw new ArgumentException("Reviewer is required.", nameof(reviewerUserId));
        Status = BarberJoinRequestStatus.Approved;
        ReviewedByUserId = reviewerUserId;
        ReviewedAtUtc = DateTimeOffset.UtcNow;
        ReviewNote = null;
        Touch();
    }

    public void Reject(Guid reviewerUserId, string? note)
    {
        EnsurePending();
        if (reviewerUserId == Guid.Empty)
            throw new ArgumentException("Reviewer is required.", nameof(reviewerUserId));
        Status = BarberJoinRequestStatus.Rejected;
        ReviewedByUserId = reviewerUserId;
        ReviewedAtUtc = DateTimeOffset.UtcNow;
        ReviewNote = Trim(note, 500);
        Touch();
    }

    public void Withdraw()
    {
        EnsurePending();
        Status = BarberJoinRequestStatus.Withdrawn;
        ReviewedAtUtc = DateTimeOffset.UtcNow;
        ReviewNote = null;
        Touch();
    }

    private void EnsurePending()
    {
        if (Status != BarberJoinRequestStatus.Pending)
            throw new InvalidOperationException("Only a pending request can be changed.");
    }

    private static string? Trim(string? value, int length) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, length)];
}
''')

replace_once(
    'backend/src/BarberTurn.Domain/Entities/DomainEntities.cs',
    '''    public void ChangeRole(UserRole role, Guid? barberId)\n    {\n        Role = role;\n        BarberId = role == UserRole.Barber ? barberId : null;\n        SecurityStamp = Guid.NewGuid().ToString("N");\n        Touch();\n    }\n\n''',
    '''    public void ChangeRole(UserRole role, Guid? barberId)\n    {\n        Role = role;\n        BarberId = role == UserRole.Barber ? barberId : null;\n        SecurityStamp = Guid.NewGuid().ToString("N");\n        Touch();\n    }\n\n    public void AssignTenant(Guid barberShopId, UserRole role, Guid? barberId = null)\n    {\n        if (barberShopId == Guid.Empty)\n            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));\n        if (BarberShopId.HasValue && BarberShopId.Value != barberShopId)\n            throw new InvalidOperationException("The user already belongs to another barbershop.");\n        if (role == UserRole.Barber && barberId is null)\n            throw new ArgumentException("A barber tenant assignment requires an operational barber.", nameof(barberId));\n\n        BarberShopId = barberShopId;\n        Role = role;\n        BarberId = role == UserRole.Barber ? barberId : null;\n        Touch();\n    }\n\n''')

write('backend/src/BarberTurn.Application/Onboarding/OnboardingContracts.cs', '''using BarberTurn.Domain.Entities;

namespace BarberTurn.Application.Onboarding;

public sealed record BarberShopDirectoryItem(Guid Id, string Name, string Slug, string TimeZoneId);
public sealed record BarberJoinRequestResponse(
    Guid Id,
    Guid BarberShopId,
    string BarberShopName,
    BarberJoinRequestStatus Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ReviewedAtUtc,
    string? ReviewNote);
public sealed record TeamBarberJoinRequestResponse(
    Guid Id,
    Guid UserId,
    string BarberName,
    string Email,
    DateTimeOffset CreatedAtUtc);
public sealed record ApproveBarberJoinRequestRequest(int ChairNumber);
public sealed record RejectBarberJoinRequestRequest(string? Note);

public interface IBarberOnboardingService
{
    Task<IReadOnlyList<BarberShopDirectoryItem>> SearchShopsAsync(string? query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BarberJoinRequestResponse>> GetMyJoinRequestsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<BarberJoinRequestResponse> RequestJoinAsync(Guid userId, Guid barberShopId, CancellationToken cancellationToken = default);
    Task<bool> WithdrawJoinRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeamBarberJoinRequestResponse>> GetPendingJoinRequestsAsync(Guid barberShopId, CancellationToken cancellationToken = default);
    Task<bool> ApproveJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, int chairNumber, CancellationToken cancellationToken = default);
    Task<bool> RejectJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, string? note, CancellationToken cancellationToken = default);
}
''')

write('backend/src/BarberTurn.Infrastructure/Onboarding/BarberOnboardingService.cs', '''using BarberTurn.Application.Onboarding;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Onboarding;

internal sealed class BarberOnboardingService(ApplicationDbContext dbContext) : IBarberOnboardingService
{
    public async Task<IReadOnlyList<BarberShopDirectoryItem>> SearchShopsAsync(string? query, CancellationToken cancellationToken = default)
    {
        var normalized = query?.Trim();
        var shops = dbContext.BarberShops.AsNoTracking().Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(normalized))
            shops = shops.Where(x => x.Name.Contains(normalized) || x.Slug.Contains(normalized));

        return await shops.OrderBy(x => x.Name).Take(25)
            .Select(x => new BarberShopDirectoryItem(x.Id, x.Name, x.Slug, x.TimeZoneId))
            .ToListAsync(cancellationToken);
    }

    public Task<IReadOnlyList<BarberJoinRequestResponse>> GetMyJoinRequestsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        QueryBarberRequests(userId).ToListAsync(cancellationToken).ContinueWith<IReadOnlyList<BarberJoinRequestResponse>>(
            task => task.Result,
            cancellationToken,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default);

    public async Task<BarberJoinRequestResponse> RequestJoinAsync(Guid userId, Guid barberShopId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The barber account was not found.");
        if (user.BarberShopId.HasValue || user.Role != UserRole.Barber)
            throw new InvalidOperationException("Only an independent barber can request membership.");
        if (!await dbContext.BarberProfiles.AnyAsync(x => x.UserId == userId, cancellationToken))
            throw new InvalidOperationException("The barber profile is missing.");
        if (!await dbContext.BarberShops.AnyAsync(x => x.Id == barberShopId && x.IsActive, cancellationToken))
            throw new InvalidOperationException("The selected barbershop is not available.");
        if (await dbContext.ShopMemberships.AnyAsync(x => x.UserId == userId && x.BarberShopId == barberShopId && x.Status == ShopMembershipStatus.Active, cancellationToken))
            throw new InvalidOperationException("The barber already belongs to this barbershop.");

        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.UserId == userId && x.BarberShopId == barberShopId,
            cancellationToken);
        if (request is null)
        {
            request = new BarberJoinRequest(userId, barberShopId);
            dbContext.BarberJoinRequests.Add(request);
        }
        else if (request.Status == BarberJoinRequestStatus.Pending)
        {
            throw new InvalidOperationException("There is already a pending request for this barbershop.");
        }
        else
        {
            request.Reopen();
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return await QueryBarberRequests(userId).SingleAsync(x => x.Id == request.Id, cancellationToken);
    }

    public async Task<bool> WithdrawJoinRequestAsync(Guid userId, Guid requestId, CancellationToken cancellationToken = default)
    {
        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.UserId == userId,
            cancellationToken);
        if (request is null || request.Status != BarberJoinRequestStatus.Pending)
            return false;
        request.Withdraw();
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TeamBarberJoinRequestResponse>> GetPendingJoinRequestsAsync(Guid barberShopId, CancellationToken cancellationToken = default) =>
        await (from request in dbContext.BarberJoinRequests.AsNoTracking()
               join user in dbContext.Users.AsNoTracking() on request.UserId equals user.Id
               where request.BarberShopId == barberShopId && request.Status == BarberJoinRequestStatus.Pending
               orderby request.CreatedAtUtc
               select new TeamBarberJoinRequestResponse(request.Id, user.Id, user.Name, user.Email, request.CreatedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<bool> ApproveJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, int chairNumber, CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(chairNumber);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.BarberShopId == barberShopId && x.Status == BarberJoinRequestStatus.Pending,
            cancellationToken);
        if (request is null)
            return false;
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == request.UserId && x.IsActive, cancellationToken);
        if (user is null || user.BarberShopId.HasValue || user.Role != UserRole.Barber)
            return false;
        var profile = await dbContext.BarberProfiles.SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        if (profile is null)
            return false;
        if (await dbContext.Barbers.AnyAsync(x => x.BarberShopId == barberShopId && x.ChairNumber == chairNumber, cancellationToken))
            throw new InvalidOperationException("That chair number is already assigned.");
        if (await dbContext.ShopMemberships.AnyAsync(x => x.UserId == user.Id && x.BarberShopId != barberShopId && x.Status == ShopMembershipStatus.Active, cancellationToken))
            throw new InvalidOperationException("The barber already has an active membership in another barbershop.");

        var barber = new Barber(barberShopId, profile.DisplayName, chairNumber);
        dbContext.Barbers.Add(barber);
        var membership = await dbContext.ShopMemberships.SingleOrDefaultAsync(
            x => x.UserId == user.Id && x.BarberShopId == barberShopId,
            cancellationToken);
        if (membership is null)
            dbContext.ShopMemberships.Add(new ShopMembership(user.Id, barberShopId, UserRole.Barber, barber.Id));
        else
            membership.ReactivateAsBarber(barber.Id);

        user.AssignTenant(barberShopId, UserRole.Barber, barber.Id);
        request.Approve(reviewerUserId);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RejectJoinRequestAsync(Guid barberShopId, Guid reviewerUserId, Guid requestId, string? note, CancellationToken cancellationToken = default)
    {
        var request = await dbContext.BarberJoinRequests.SingleOrDefaultAsync(
            x => x.Id == requestId && x.BarberShopId == barberShopId && x.Status == BarberJoinRequestStatus.Pending,
            cancellationToken);
        if (request is null)
            return false;
        request.Reject(reviewerUserId, note);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<BarberJoinRequestResponse> QueryBarberRequests(Guid userId) =>
        from request in dbContext.BarberJoinRequests.AsNoTracking()
        join shop in dbContext.BarberShops.AsNoTracking() on request.BarberShopId equals shop.Id
        where request.UserId == userId
        orderby request.CreatedAtUtc descending
        select new BarberJoinRequestResponse(
            request.Id,
            request.BarberShopId,
            shop.Name,
            request.Status,
            request.CreatedAtUtc,
            request.ReviewedAtUtc,
            request.ReviewNote);
}
''')

replace_once(
    'backend/src/BarberTurn.Domain/Entities/IdentityEntities.cs',
    '''    public void Revoke()\n    {\n        if (Status == ShopMembershipStatus.Revoked)\n            return;\n\n        Status = ShopMembershipStatus.Revoked;\n        EndedAtUtc = DateTimeOffset.UtcNow;\n        Touch();\n    }\n\n''',
    '''    public void Revoke()\n    {\n        if (Status == ShopMembershipStatus.Revoked)\n            return;\n\n        Status = ShopMembershipStatus.Revoked;\n        EndedAtUtc = DateTimeOffset.UtcNow;\n        Touch();\n    }\n\n    public void ReactivateAsBarber(Guid barberId)\n    {\n        if (barberId == Guid.Empty)\n            throw new ArgumentException("Barber is required.", nameof(barberId));\n        Role = UserRole.Barber;\n        BarberId = barberId;\n        Status = ShopMembershipStatus.Active;\n        EndedAtUtc = null;\n        Touch();\n    }\n\n''')

replace_once(
    'backend/src/BarberTurn.Infrastructure/Persistence/ApplicationDbContext.cs',
    '    public DbSet<ShopMembership> ShopMemberships => Set<ShopMembership>();\n',
    '    public DbSet<ShopMembership> ShopMemberships => Set<ShopMembership>();\n    public DbSet<BarberJoinRequest> BarberJoinRequests => Set<BarberJoinRequest>();\n')

replace_once(
    'backend/src/BarberTurn.Infrastructure/Persistence/ApplicationDbContext.cs',
    '''        modelBuilder.Entity<Barber>(entity =>\n        {\n''',
    '''        modelBuilder.Entity<BarberJoinRequest>(entity =>\n        {\n            entity.ToTable("BarberJoinRequests");\n            entity.HasKey(x => x.Id);\n            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();\n            entity.Property(x => x.ReviewNote).HasMaxLength(500);\n            entity.HasIndex(x => new { x.UserId, x.BarberShopId }).IsUnique();\n            entity.HasIndex(x => new { x.BarberShopId, x.Status, x.CreatedAtUtc });\n            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);\n            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Cascade);\n            entity.HasOne<User>().WithMany().HasForeignKey(x => x.ReviewedByUserId).OnDelete(DeleteBehavior.NoAction);\n        });\n\n        modelBuilder.Entity<Barber>(entity =>\n        {\n''')

replace_once(
    'backend/src/BarberTurn.Infrastructure/DependencyInjection.cs',
    'using BarberTurn.Application.Queue;\n',
    'using BarberTurn.Application.Queue;\nusing BarberTurn.Application.Onboarding;\n')
replace_once(
    'backend/src/BarberTurn.Infrastructure/DependencyInjection.cs',
    'using BarberTurn.Infrastructure.Queue;\n',
    'using BarberTurn.Infrastructure.Queue;\nusing BarberTurn.Infrastructure.Onboarding;\n')
replace_once(
    'backend/src/BarberTurn.Infrastructure/DependencyInjection.cs',
    '        services.AddScoped<IQueueService, QueueService>();\n',
    '        services.AddScoped<IQueueService, QueueService>();\n        services.AddScoped<IBarberOnboardingService, BarberOnboardingService>();\n')
replace_once(
    'backend/src/BarberTurn.Infrastructure/DependencyInjection.cs',
    '''            options.AddPolicy("TenantUser", policy =>\n                policy.RequireAuthenticatedUser()\n                    .RequireClaim("email_verified", "true")\n                    .RequireClaim("barbershop_id")\n                    .RequireClaim(System.Security.Claims.ClaimTypes.Role));\n''',
    '''            options.AddPolicy("TenantUser", policy =>\n                policy.RequireAuthenticatedUser()\n                    .RequireClaim("email_verified", "true")\n                    .RequireClaim("barbershop_id")\n                    .RequireClaim(System.Security.Claims.ClaimTypes.Role));\n            options.AddPolicy("OnboardingUser", policy =>\n                policy.RequireAuthenticatedUser()\n                    .RequireClaim("email_verified", "true")\n                    .RequireAssertion(context => !context.User.HasClaim(claim => claim.Type == "barbershop_id")));\n''')

write('backend/src/BarberTurn.Api/Endpoints/BarberOnboardingEndpoints.cs', '''using System.Security.Claims;
using BarberTurn.Api.Contracts;
using BarberTurn.Api.Filters;
using BarberTurn.Application.Onboarding;

namespace BarberTurn.Api.Endpoints;

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
''')

replace_once(
    'backend/src/BarberTurn.Api/Program.cs',
    'app.MapAuthEndpoints();\n',
    'app.MapAuthEndpoints();\napp.MapBarberOnboardingEndpoints();\n')

write('mobile/src/onboarding/onboardingApi.ts', '''import { apiRequest } from '@/api/httpClient';

export type BarberShopDirectoryItem = {
  id: string;
  name: string;
  slug: string;
  timeZoneId: string;
};

export type BarberJoinRequest = {
  id: string;
  barberShopId: string;
  barberShopName: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';
  createdAtUtc: string;
  reviewedAtUtc?: string | null;
  reviewNote?: string | null;
};

export function searchShops(accessToken: string, query = '') {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  return apiRequest<BarberShopDirectoryItem[]>(`/api/onboarding/shops${suffix}`, {}, accessToken);
}

export function getMyJoinRequests(accessToken: string) {
  return apiRequest<BarberJoinRequest[]>('/api/onboarding/join-requests', {}, accessToken);
}

export function requestJoin(accessToken: string, barberShopId: string) {
  return apiRequest<BarberJoinRequest>(`/api/onboarding/join-requests/${barberShopId}`, { method: 'POST' }, accessToken);
}

export function withdrawJoinRequest(accessToken: string, requestId: string) {
  return apiRequest<void>(`/api/onboarding/join-requests/${requestId}`, { method: 'DELETE' }, accessToken);
}
''')

write('mobile/app/onboarding.tsx', '''import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { MobileApiError } from '@/api/httpClient';
import { getMyJoinRequests, requestJoin, searchShops, withdrawJoinRequest, type BarberJoinRequest, type BarberShopDirectoryItem } from '@/onboarding/onboardingApi';

export default function OnboardingScreen() {
  const { status, session, signOut, refresh } = useAuth();
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState<BarberShopDirectoryItem[]>([]);
  const [requests, setRequests] = useState<BarberJoinRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (search = query) => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const [shopResults, joinRequests] = await Promise.all([
        searchShops(session.accessToken, search),
        getMyJoinRequests(session.accessToken),
      ]);
      setShops(shopResults);
      setRequests(joinRequests);
      if (joinRequests.some(item => item.status === 'Approved')) {
        const token = await refresh();
        if (token) router.replace('/(app)');
      }
    } catch (exception) {
      setError(exception instanceof MobileApiError ? exception.message : 'No pudimos cargar tu onboarding.');
    } finally {
      setBusy(false);
    }
  }, [query, refresh, session]);

  useEffect(() => { void load(''); }, [load]);

  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  if (status === 'authenticated') return <Redirect href="/(app)" />;

  const pendingByShop = new Map(requests.filter(item => item.status === 'Pending').map(item => [item.barberShopId, item]));

  async function join(shop: BarberShopDirectoryItem) {
    if (!session) return;
    setBusy(true); setError('');
    try {
      await requestJoin(session.accessToken, shop.id);
      await load(query);
      Alert.alert('Solicitud enviada', `${shop.name} podrá revisar tu solicitud desde su panel.`);
    } catch (exception) {
      setError(exception instanceof MobileApiError ? exception.message : 'No se pudo enviar la solicitud.');
      setBusy(false);
    }
  }

  async function withdraw(request: BarberJoinRequest) {
    if (!session) return;
    setBusy(true); setError('');
    try {
      await withdrawJoinRequest(session.accessToken, request.id);
      await load(query);
    } catch (exception) {
      setError(exception instanceof MobileApiError ? exception.message : 'No se pudo retirar la solicitud.');
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>BARBERTURN · BARBERO</Text>
      <Text style={styles.title}>Encuentra tu barbería</Text>
      <Text style={styles.body}>Hola {session?.user.name}. Tu perfil profesional ya existe; ahora solicita ingreso a la barbería donde trabajas.</Text>

      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Nombre o slug de la barbería" style={styles.input} autoCapitalize="none" />
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => void load(query)} disabled={busy}>
          <Text style={styles.primaryButtonText}>Buscar</Text>
        </Pressable>
      </View>

      {busy && <ActivityIndicator />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Barberías disponibles</Text>
      {shops.map(shop => {
        const pending = pendingByShop.get(shop.id);
        return (
          <View key={shop.id} style={styles.card}>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{shop.name}</Text>
              <Text style={styles.meta}>@{shop.slug} · {shop.timeZoneId}</Text>
            </View>
            {pending ? (
              <Pressable style={styles.secondaryButton} onPress={() => void withdraw(pending)} disabled={busy}>
                <Text style={styles.secondaryButtonText}>Retirar solicitud</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={() => void join(shop)} disabled={busy}>
                <Text style={styles.primaryButtonText}>Solicitar ingreso</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Mis solicitudes</Text>
      {requests.length === 0 ? <Text style={styles.muted}>Aún no has enviado solicitudes.</Text> : requests.map(request => (
        <View key={request.id} style={styles.requestCard}>
          <Text style={styles.cardTitle}>{request.barberShopName}</Text>
          <Text style={styles.meta}>Estado: {request.status}</Text>
          {!!request.reviewNote && <Text style={styles.meta}>Nota: {request.reviewNote}</Text>}
        </View>
      ))}

      <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => void load(query)} disabled={busy}>
        <Text style={styles.secondaryButtonText}>Actualizar estado</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => void signOut()}>
        <Text style={styles.linkText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: '#f7f7f5', flexGrow: 1 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 30, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 24 },
  searchRow: { gap: 10 },
  input: { borderWidth: 1, borderColor: '#c9c9c4', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: '700' },
  card: { gap: 12, borderWidth: 1, borderColor: '#deded8', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  requestCard: { gap: 6, borderWidth: 1, borderColor: '#deded8', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  cardCopy: { gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13, color: '#5d5d58' },
  muted: { color: '#6b6b65' },
  error: { color: '#a82020', fontWeight: '600' },
  primaryButton: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#111', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  secondaryButtonText: { fontWeight: '700' },
  linkButton: { paddingVertical: 12, alignItems: 'center' },
  linkText: { textDecorationLine: 'underline', fontWeight: '600' },
});
''')

# Web onboarding: replace the placeholder with a functional panel embedded in App.tsx.
replace_once(
    'frontend/src/App.tsx',
    "import { FormEvent, lazy, Suspense, useEffect, useState } from 'react'\n",
    "import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react'\n")
replace_once(
    'frontend/src/App.tsx',
    '''const BarberPortal = lazy(() => import('./BarberPortal'))\n\n''',
    '''const BarberPortal = lazy(() => import('./BarberPortal'))\n\ntype OnboardingShop = { id: string; name: string; slug: string; timeZoneId: string }\ntype OnboardingJoinRequest = { id: string; barberShopId: string; barberShopName: string; status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'; reviewNote?: string | null }\n\nfunction BarberOnboardingPanel({ auth, onLogout, onAuthChanged }: { auth: Auth; onLogout: () => void; onAuthChanged: (next: Auth) => void }) {\n  const [query, setQuery] = useState('')\n  const [shops, setShops] = useState<OnboardingShop[]>([])\n  const [requests, setRequests] = useState<OnboardingJoinRequest[]>([])\n  const [busy, setBusy] = useState(false)\n  const [message, setMessage] = useState('')\n  const pendingByShop = useMemo(() => new Map(requests.filter(item => item.status === 'Pending').map(item => [item.barberShopId, item])), [requests])\n\n  async function load(search = query) {\n    setBusy(true); setMessage('')\n    try {\n      const suffix = search.trim() ? `?query=${encodeURIComponent(search.trim())}` : ''\n      const [shopResults, joinRequests] = await Promise.all([api<OnboardingShop[]>(`/api/onboarding/shops${suffix}`), api<OnboardingJoinRequest[]>('/api/onboarding/join-requests')])\n      setShops(shopResults); setRequests(joinRequests)\n      if (joinRequests.some(item => item.status === 'Approved')) {\n        const next = await publicApi<Auth>('/api/auth/refresh', { method: 'POST' })\n        writeAuth(next); onAuthChanged(next)\n      }\n    } catch (exception) { setMessage(exception instanceof Error ? exception.message : 'No se pudo cargar el onboarding.') }\n    finally { setBusy(false) }\n  }\n\n  useEffect(() => { void load('') }, [])\n\n  async function requestJoin(shop: OnboardingShop) {\n    setBusy(true); setMessage('')\n    try { await api(`/api/onboarding/join-requests/${shop.id}`, { method: 'POST' }); await load(query); setMessage(`Solicitud enviada a ${shop.name}.`) }\n    catch (exception) { setMessage(exception instanceof Error ? exception.message : 'No se pudo enviar la solicitud.'); setBusy(false) }\n  }\n\n  async function withdraw(request: OnboardingJoinRequest) {\n    setBusy(true); setMessage('')\n    try { await api(`/api/onboarding/join-requests/${request.id}`, { method: 'DELETE' }); await load(query) }\n    catch (exception) { setMessage(exception instanceof Error ? exception.message : 'No se pudo retirar la solicitud.'); setBusy(false) }\n  }\n\n  return <main className=\"login-shell\"><section className=\"login-card\">\n    <BarberTurnLogo /><h1>Encuentra tu barbería</h1>\n    <p className=\"login-subtitle\">Hola {auth.name}. Tu perfil profesional está listo. Busca tu barbería y solicita ingreso.</p>\n    <div className=\"login-form\"><label className=\"login-field\"><span>Barbería</span><div className=\"input-wrap\"><input value={query} onChange={event => setQuery(event.target.value)} placeholder=\"Nombre o slug\" /></div></label>\n      <button className=\"login-submit\" disabled={busy} onClick={() => void load(query)}>{busy ? 'Cargando…' : 'Buscar'}</button></div>\n    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>\n      {shops.map(shop => { const pending = pendingByShop.get(shop.id); return <article key={shop.id} style={{ border: '1px solid var(--border, #ddd)', borderRadius: 12, padding: 14 }}>\n        <strong>{shop.name}</strong><p className=\"login-subtitle\">@{shop.slug}</p>\n        {pending ? <button className=\"demo-button\" disabled={busy} onClick={() => void withdraw(pending)}>Retirar solicitud</button> : <button className=\"login-submit\" disabled={busy} onClick={() => void requestJoin(shop)}>Solicitar ingreso</button>}\n      </article> })}\n    </div>\n    <h2 style={{ marginTop: 22 }}>Mis solicitudes</h2>\n    {requests.length === 0 ? <p className=\"login-subtitle\">Aún no has enviado solicitudes.</p> : requests.map(request => <p key={request.id} className=\"login-subtitle\"><strong>{request.barberShopName}</strong> · {request.status}{request.reviewNote ? ` · ${request.reviewNote}` : ''}</p>)}\n    <button className=\"demo-button\" disabled={busy} onClick={() => void load(query)}>Actualizar estado</button>\n    <button className=\"demo-button\" type=\"button\" onClick={onLogout}>Cerrar sesión</button>\n    {message && <p className=\"login-error\" role=\"status\">{message}</p>}\n  </section></main>\n}\n\n''')
replace_once(
    'frontend/src/App.tsx',
    '''  if (auth?.sessionScope === 'Onboarding') return <main className="login-shell"><section className="login-card">\n    <BarberTurnLogo /><h1>Tu perfil de barbero está listo</h1>\n    <p className="login-subtitle">Todavía no perteneces a una barbería. En la siguiente etapa podrás aceptar invitaciones, solicitar ingreso o usar un código de incorporación.</p>\n    <button className="demo-button" type="button" onClick={logout}>Cerrar sesión</button>\n  </section></main>\n''',
    '''  if (auth?.sessionScope === 'Onboarding') return <BarberOnboardingPanel auth={auth} onLogout={logout} onAuthChanged={setAuth} />\n''')

write('backend/tests/BarberTurn.Api.Tests/BarberOnboardingTests.cs', '''using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BarberTurn.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class BarberOnboardingTests
{
    private readonly BarberTurnFactory factory;
    public BarberOnboardingTests(BarberTurnFactory factory) => this.factory = factory;

    [Fact]
    public async Task IndependentBarberCanRequestJoinAndOwnerCanApprove()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        var suffix = Guid.NewGuid().ToString("N")[..10];
        const string password = "ValidPass123!";

        var ownerResponse = await client.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Stage D {suffix}", barberShopSlug = $"stage-d-{suffix}", name = "Owner Stage D",
            email = $"owner-{suffix}@example.com", password, acceptedTerms = true
        });
        ownerResponse.EnsureSuccessStatusCode();
        var owner = await ownerResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(owner);

        using var barberClient = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        var barberResponse = await barberClient.PostAsJsonAsync("/api/auth/register-barber", new
        {
            name = $"Barber {suffix}", email = $"barber-{suffix}@example.com", password, acceptedTerms = true
        });
        barberResponse.EnsureSuccessStatusCode();
        var barber = await barberResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(barber);
        Assert.Equal("Onboarding", barber.SessionScope);

        barberClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", barber.AccessToken);
        var shops = await barberClient.GetFromJsonAsync<List<ShopItem>>("/api/onboarding/shops?query=Stage%20D");
        var shop = Assert.Single(shops!.Where(x => x.Id == owner.BarberShopId));
        var joinResponse = await barberClient.PostAsync($"/api/onboarding/join-requests/{shop.Id}", null);
        Assert.Equal(HttpStatusCode.Created, joinResponse.StatusCode);
        var join = await joinResponse.Content.ReadFromJsonAsync<JoinPayload>();
        Assert.NotNull(join);
        Assert.Equal("Pending", join.Status);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", owner.AccessToken);
        var pending = await client.GetFromJsonAsync<List<TeamJoinPayload>>("/api/team/join-requests/");
        var pendingRequest = Assert.Single(pending!.Where(x => x.Id == join.Id));
        var approve = await client.PostAsJsonAsync($"/api/team/join-requests/{pendingRequest.Id}/approve", new { chairNumber = 97 });
        Assert.Equal(HttpStatusCode.NoContent, approve.StatusCode);

        var refreshed = await barberClient.PostAsync("/api/auth/refresh", null);
        refreshed.EnsureSuccessStatusCode();
        var tenant = await refreshed.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(tenant);
        Assert.Equal("Tenant", tenant.SessionScope);
        Assert.Equal(shop.Id, tenant.BarberShopId);
        Assert.NotNull(tenant.BarberId);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await db.ShopMemberships.AnyAsync(x => x.UserId == barber.UserId && x.BarberShopId == shop.Id && x.Status == ShopMembershipStatus.Active));
        Assert.True(await db.BarberJoinRequests.AnyAsync(x => x.Id == join.Id && x.Status == BarberJoinRequestStatus.Approved));
    }

    private sealed record AuthPayload(string AccessToken, Guid UserId, Guid? BarberShopId, Guid? BarberId, string SessionScope);
    private sealed record ShopItem(Guid Id, string Name);
    private sealed record JoinPayload(Guid Id, string Status);
    private sealed record TeamJoinPayload(Guid Id, Guid UserId);
}
''')

write('docs/barber-onboarding.md', '''# Barber onboarding and shop membership

Stage D separates a professional barber identity from barbershop membership.

## Flow

1. An independent barber registers and receives an onboarding-scoped session.
2. The barber searches active barbershops and creates a `BarberJoinRequest`.
3. Owners/administrators review pending requests inside their own tenant only.
4. Approval creates the operational `Barber`, activates a `ShopMembership`, and assigns the user to the tenant.
5. The barber refreshes the session and receives tenant claims (`barbershop_id`, role and `barber_id`).
6. Rejection or withdrawal leaves the professional identity independent and reusable.

`BarberJoinRequest` is deliberately separate from `ShopMembership`: a request is intent; a membership is an accepted relationship.
''')

# Keep the changelog additive without depending on its exact previous heading.
changelog = Path('CHANGELOG.md')
if changelog.exists():
    current = changelog.read_text()
    note = '''## Unreleased - Barber onboarding Stage D\n\n- Added barber-to-shop join requests with owner/admin approval and rejection.\n- Added searchable onboarding for web and mobile.\n- Approval now materializes the operational barber and active shop membership, then upgrades the next refreshed session to tenant scope.\n\n'''
    if '## Unreleased - Barber onboarding Stage D' not in current:
        changelog.write_text(note + current)

# The bootstrap artifacts are intentionally excluded from the final product commit.
Path('.github/scripts/stage_d_bootstrap.py').unlink(missing_ok=True)
Path('.github/workflows/stage-d-bootstrap.yml').unlink(missing_ok=True)
