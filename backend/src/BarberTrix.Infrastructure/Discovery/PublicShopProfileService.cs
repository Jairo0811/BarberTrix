using BarberTrix.Application.Discovery;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Infrastructure.Discovery;

public sealed class PublicShopProfileService(ApplicationDbContext db) : IPublicShopProfileService
{
    public async Task<PublicShopProfileDto> GetAsync(Guid shopId, CancellationToken cancellationToken)
    {
        var profile = await GetProfileAsync(shopId, cancellationToken);
        return await ToDtoAsync(shopId, profile, cancellationToken);
    }

    public async Task<PublicShopProfileDto> UpdateAsync(Guid shopId, UpdatePublicShopProfileRequest request, CancellationToken cancellationToken)
    {
        if (!request.AcceptsWalkIns && !request.AcceptsAppointments)
            throw new ArgumentException("At least one booking mode must be enabled.");

        var description = Normalize(request.Description, 1000, nameof(request.Description));
        var publicPhone = Normalize(request.PublicPhone, 40, nameof(request.PublicPhone));
        var whatsAppPhone = Normalize(request.WhatsAppPhone, 40, nameof(request.WhatsAppPhone));
        var logoUrl = NormalizeUrl(request.LogoUrl, nameof(request.LogoUrl));
        var coverImageUrl = NormalizeUrl(request.CoverImageUrl, nameof(request.CoverImageUrl));
        var now = DateTimeOffset.UtcNow;
        var existing = await GetProfileAsync(shopId, cancellationToken);

        if (existing is null)
        {
            await db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO PublicShopProfiles
    (Id, CreatedAtUtc, UpdatedAtUtc, BarberShopId, Description, PublicPhone, WhatsAppPhone, LogoUrl, CoverImageUrl, AcceptsWalkIns, AcceptsAppointments, IsPublished, PublishedAtUtc)
VALUES
    ({Guid.NewGuid()}, {now}, {now}, {shopId}, {description}, {publicPhone}, {whatsAppPhone}, {logoUrl}, {coverImageUrl}, {request.AcceptsWalkIns}, {request.AcceptsAppointments}, {false}, {null});", cancellationToken);
        }
        else
        {
            await db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE PublicShopProfiles
SET Description = {description},
    PublicPhone = {publicPhone},
    WhatsAppPhone = {whatsAppPhone},
    LogoUrl = {logoUrl},
    CoverImageUrl = {coverImageUrl},
    AcceptsWalkIns = {request.AcceptsWalkIns},
    AcceptsAppointments = {request.AcceptsAppointments},
    UpdatedAtUtc = {now}
WHERE BarberShopId = {shopId};", cancellationToken);
        }

        return await ToDtoAsync(shopId, await GetProfileAsync(shopId, cancellationToken), cancellationToken);
    }

    public async Task<PublicShopProfileDto> SetPublishedAsync(Guid shopId, bool published, CancellationToken cancellationToken)
    {
        var profile = await GetProfileAsync(shopId, cancellationToken);
        if (profile is null)
        {
            var now = DateTimeOffset.UtcNow;
            await db.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO PublicShopProfiles
    (Id, CreatedAtUtc, UpdatedAtUtc, BarberShopId, AcceptsWalkIns, AcceptsAppointments, IsPublished, PublishedAtUtc)
VALUES
    ({Guid.NewGuid()}, {now}, {now}, {shopId}, {true}, {true}, {false}, {null});", cancellationToken);
            profile = await GetProfileAsync(shopId, cancellationToken);
        }

        if (published)
        {
            var issues = await GetPublicationIssuesAsync(shopId, cancellationToken);
            if (issues.Count > 0)
                throw new InvalidOperationException($"Complete the public profile before publishing: {string.Join("; ", issues)}");
        }

        var changedAt = DateTimeOffset.UtcNow;
        if (published)
        {
            await db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE PublicShopProfiles
SET IsPublished = {true},
    PublishedAtUtc = COALESCE(PublishedAtUtc, {changedAt}),
    UpdatedAtUtc = {changedAt}
WHERE BarberShopId = {shopId};", cancellationToken);
        }
        else
        {
            await db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE PublicShopProfiles
SET IsPublished = {false}, UpdatedAtUtc = {changedAt}
WHERE BarberShopId = {shopId};", cancellationToken);
        }

        return await ToDtoAsync(shopId, await GetProfileAsync(shopId, cancellationToken), cancellationToken);
    }

    private Task<PublicProfileRow?> GetProfileAsync(Guid shopId, CancellationToken cancellationToken) =>
        db.Database.SqlQuery<PublicProfileRow>($@"
SELECT Description, PublicPhone, WhatsAppPhone, LogoUrl, CoverImageUrl,
       AcceptsWalkIns, AcceptsAppointments, IsPublished, PublishedAtUtc
FROM PublicShopProfiles
WHERE BarberShopId = {shopId}")
            .SingleOrDefaultAsync(cancellationToken);

    private async Task<PublicShopProfileDto> ToDtoAsync(Guid shopId, PublicProfileRow? profile, CancellationToken cancellationToken)
    {
        var issues = await GetPublicationIssuesAsync(shopId, cancellationToken);
        return new PublicShopProfileDto(
            profile?.Description,
            profile?.PublicPhone,
            profile?.WhatsAppPhone,
            profile?.LogoUrl,
            profile?.CoverImageUrl,
            profile?.AcceptsWalkIns ?? true,
            profile?.AcceptsAppointments ?? true,
            profile?.IsPublished ?? false,
            profile?.PublishedAtUtc,
            issues);
    }

    private async Task<IReadOnlyList<string>> GetPublicationIssuesAsync(Guid shopId, CancellationToken cancellationToken)
    {
        var issues = new List<string>();
        if (!await db.BarberShops.AsNoTracking().AnyAsync(x => x.Id == shopId && x.IsActive, cancellationToken)) issues.Add("barbershop is inactive");
        if (!await db.ShopLocations.AsNoTracking().AnyAsync(x => x.BarberShopId == shopId && x.IsActive && x.Address != null && x.Address != "", cancellationToken)) issues.Add("add an active location with an address");
        if (!await db.BarberServices.AsNoTracking().AnyAsync(x => x.BarberShopId == shopId && x.IsActive, cancellationToken)) issues.Add("add at least one active service");
        if (!await db.Barbers.AsNoTracking().AnyAsync(x => x.BarberShopId == shopId && x.IsActive, cancellationToken)) issues.Add("add at least one active barber");
        return issues;
    }

    private static string? Normalize(string? value, int maxLength, string parameterName)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim();
        if (normalized.Length > maxLength) throw new ArgumentException($"Maximum length is {maxLength} characters.", parameterName);
        return normalized;
    }

    private static string? NormalizeUrl(string? value, string parameterName)
    {
        var normalized = Normalize(value, 500, parameterName);
        if (normalized is null) return null;
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            throw new ArgumentException("A valid HTTP(S) URL is required.", parameterName);
        return normalized;
    }

    private sealed record PublicProfileRow(
        string? Description,
        string? PublicPhone,
        string? WhatsAppPhone,
        string? LogoUrl,
        string? CoverImageUrl,
        bool AcceptsWalkIns,
        bool AcceptsAppointments,
        bool IsPublished,
        DateTimeOffset? PublishedAtUtc);
}
