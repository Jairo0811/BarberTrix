using BarberTrix.Application.Discovery;
using BarberTrix.Domain.Entities;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTrix.Infrastructure.Discovery;

public sealed class PublicShopProfileService(ApplicationDbContext db) : IPublicShopProfileService
{
    private DbSet<PublicShopProfile> Profiles => db.Set<PublicShopProfile>();

    public async Task<PublicShopProfileDto> GetAsync(Guid shopId, CancellationToken cancellationToken)
    {
        var profile = await Profiles.AsNoTracking().SingleOrDefaultAsync(x => x.BarberShopId == shopId, cancellationToken);
        return await ToDtoAsync(shopId, profile, cancellationToken);
    }

    public async Task<PublicShopProfileDto> UpdateAsync(Guid shopId, UpdatePublicShopProfileRequest request, CancellationToken cancellationToken)
    {
        var profile = await Profiles.SingleOrDefaultAsync(x => x.BarberShopId == shopId, cancellationToken);
        if (profile is null) { profile = new PublicShopProfile(shopId); Profiles.Add(profile); }
        profile.Update(request.Description, request.PublicPhone, request.WhatsAppPhone, request.LogoUrl, request.CoverImageUrl, request.AcceptsWalkIns, request.AcceptsAppointments);
        await db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(shopId, profile, cancellationToken);
    }

    public async Task<PublicShopProfileDto> SetPublishedAsync(Guid shopId, bool published, CancellationToken cancellationToken)
    {
        var profile = await Profiles.SingleOrDefaultAsync(x => x.BarberShopId == shopId, cancellationToken);
        if (profile is null) { profile = new PublicShopProfile(shopId); Profiles.Add(profile); }
        if (published)
        {
            var issues = await GetPublicationIssuesAsync(shopId, cancellationToken);
            if (issues.Count > 0) throw new InvalidOperationException($"Complete the public profile before publishing: {string.Join("; ", issues)}");
            profile.Publish();
        }
        else profile.Unpublish();
        await db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(shopId, profile, cancellationToken);
    }

    private async Task<PublicShopProfileDto> ToDtoAsync(Guid shopId, PublicShopProfile? profile, CancellationToken cancellationToken)
    {
        var issues = await GetPublicationIssuesAsync(shopId, cancellationToken);
        return new PublicShopProfileDto(profile?.Description, profile?.PublicPhone, profile?.WhatsAppPhone, profile?.LogoUrl, profile?.CoverImageUrl, profile?.AcceptsWalkIns ?? true, profile?.AcceptsAppointments ?? true, profile?.IsPublished ?? false, profile?.PublishedAtUtc, issues);
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
}
