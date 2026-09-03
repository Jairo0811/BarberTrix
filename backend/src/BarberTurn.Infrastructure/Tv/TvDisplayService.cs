using System.Security.Cryptography;
using System.Text;
using BarberTurn.Application.Common;
using BarberTurn.Application.Queue;
using BarberTurn.Application.Tv;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Tv;

internal sealed class TvDisplayService(
    ApplicationDbContext dbContext,
    IPlanLimitService planLimitService,
    IQueueService queueService) : ITvDisplayService
{
    private static readonly TimeSpan PairingLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan SeenWriteInterval = TimeSpan.FromMinutes(1);

    public async Task<IReadOnlyList<TvDisplayResponse>> ListAsync(Guid barberShopId, CancellationToken cancellationToken = default)
    {
        await planLimitService.EnsureCanUseAsync(barberShopId, PlanFeature.Tv, cancellationToken);
        return await dbContext.TvDisplays.AsNoTracking()
            .Where(display => display.BarberShopId == barberShopId)
            .OrderBy(display => display.Name)
            .Select(display => Map(display))
            .ToListAsync(cancellationToken);
    }

    public async Task<(TvDisplayResponse Display, TvPairingCodeResponse Pairing)> CreateAsync(
        Guid barberShopId,
        CreateTvDisplayRequest request,
        CancellationToken cancellationToken = default)
    {
        await planLimitService.EnsureCanUseAsync(barberShopId, PlanFeature.Tv, cancellationToken);
        var display = new TvDisplay(barberShopId, request.Name);
        dbContext.TvDisplays.Add(display);
        var pairing = await IssuePairingCodeCoreAsync(display, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (Map(display), pairing);
    }

    public async Task<TvPairingCodeResponse?> IssuePairingCodeAsync(
        Guid barberShopId,
        Guid displayId,
        CancellationToken cancellationToken = default)
    {
        await planLimitService.EnsureCanUseAsync(barberShopId, PlanFeature.Tv, cancellationToken);
        var display = await dbContext.TvDisplays.SingleOrDefaultAsync(
            item => item.Id == displayId && item.BarberShopId == barberShopId,
            cancellationToken);
        if (display is null)
            return null;

        var pairing = await IssuePairingCodeCoreAsync(display, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return pairing;
    }

    public async Task<bool> RevokeAsync(Guid barberShopId, Guid displayId, CancellationToken cancellationToken = default)
    {
        var display = await dbContext.TvDisplays.SingleOrDefaultAsync(
            item => item.Id == displayId && item.BarberShopId == barberShopId,
            cancellationToken);
        if (display is null)
            return false;

        display.Revoke();
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PairTvDisplayResponse?> PairAsync(string code, CancellationToken cancellationToken = default)
    {
        var normalizedCode = NormalizePairingCode(code);
        if (normalizedCode is null)
            return null;

        var codeHash = Hash(normalizedCode);
        var now = DateTimeOffset.UtcNow;
        var display = await dbContext.TvDisplays.SingleOrDefaultAsync(
            item => item.IsActive && item.PairingCodeHash == codeHash && item.PairingExpiresAtUtc > now,
            cancellationToken);
        if (display is null)
            return null;

        var usage = await planLimitService.GetUsageAsync(display.BarberShopId, cancellationToken);
        if (!usage.CanUseTv)
            return null;

        var shop = await dbContext.BarberShops.AsNoTracking()
            .Where(item => item.Id == display.BarberShopId && item.IsActive)
            .Select(item => new { item.Name })
            .SingleOrDefaultAsync(cancellationToken);
        if (shop is null)
            return null;

        var token = CreateDisplayToken();
        display.Pair(Hash(token));
        await dbContext.SaveChangesAsync(cancellationToken);
        return new PairTvDisplayResponse(token, display.Id, display.Name, shop.Name);
    }

    public async Task<TvDisplaySnapshotResponse?> GetSnapshotAsync(string displayToken, CancellationToken cancellationToken = default)
    {
        var session = await ResolveSessionAsync(displayToken, cancellationToken);
        if (session is null)
            return null;

        var display = await dbContext.TvDisplays.AsNoTracking()
            .Where(item => item.Id == session.DisplayId)
            .Select(item => new { item.Name })
            .SingleAsync(cancellationToken);
        var shop = await dbContext.BarberShops.AsNoTracking()
            .Where(item => item.Id == session.BarberShopId)
            .Select(item => new { item.Name })
            .SingleAsync(cancellationToken);
        var queue = await queueService.GetPublicQueueAsync(session.ShopSlug, cancellationToken);
        if (queue is null)
            return null;

        return new TvDisplaySnapshotResponse(session.DisplayId, display.Name, shop.Name, session.ShopSlug, queue);
    }

    public async Task<TvDisplaySession?> ResolveSessionAsync(string displayToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(displayToken))
            return null;

        var tokenHash = Hash(displayToken.Trim());
        var display = await dbContext.TvDisplays.SingleOrDefaultAsync(
            item => item.IsActive && item.DisplayTokenHash == tokenHash,
            cancellationToken);
        if (display is null)
            return null;

        var shop = await dbContext.BarberShops.AsNoTracking()
            .Where(item => item.Id == display.BarberShopId && item.IsActive)
            .Select(item => new { item.Slug })
            .SingleOrDefaultAsync(cancellationToken);
        if (shop is null)
            return null;

        var usage = await planLimitService.GetUsageAsync(display.BarberShopId, cancellationToken);
        if (!usage.CanUseTv)
            return null;

        var now = DateTimeOffset.UtcNow;
        if (display.LastSeenAtUtc is null || now - display.LastSeenAtUtc >= SeenWriteInterval)
        {
            display.MarkSeen(now);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return new TvDisplaySession(display.Id, display.BarberShopId, shop.Slug);
    }

    private async Task<TvPairingCodeResponse> IssuePairingCodeCoreAsync(TvDisplay display, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", System.Globalization.CultureInfo.InvariantCulture);
            var codeHash = Hash(code);
            var collision = await dbContext.TvDisplays.AsNoTracking().AnyAsync(
                item => item.PairingCodeHash == codeHash,
                cancellationToken);
            if (collision)
                continue;

            var expiresAtUtc = DateTimeOffset.UtcNow.Add(PairingLifetime);
            display.IssuePairingCode(codeHash, expiresAtUtc);
            return new TvPairingCodeResponse(display.Id, code, expiresAtUtc);
        }

        throw new InvalidOperationException("A unique TV pairing code could not be generated. Try again.");
    }

    private static string? NormalizePairingCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;
        var digits = new string(code.Where(char.IsAsciiDigit).ToArray());
        return digits.Length == 6 ? digits : null;
    }

    private static string CreateDisplayToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static TvDisplayResponse Map(TvDisplay display) => new(
        display.Id,
        display.Name,
        display.IsActive,
        display.DisplayTokenHash is not null,
        display.PairedAtUtc,
        display.LastSeenAtUtc,
        display.PairingExpiresAtUtc);
}
