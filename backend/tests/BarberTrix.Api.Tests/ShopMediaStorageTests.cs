using BarberTrix.Infrastructure.Discovery;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BarberTrix.Api.Tests;

public sealed class ShopMediaStorageTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "barbertrix-media-" + Guid.NewGuid().ToString("N"));
    private readonly ShopMediaStorage storage;
    private static readonly byte[] Png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0];

    public ShopMediaStorageTests() =>
        storage = new ShopMediaStorage(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ShopMedia:RootPath"] = root }).Build());

    [Fact]
    public async Task StoresAndReadsABarberPortraitUnderItsOwnKind()
    {
        var shopId = Guid.NewGuid();
        var kind = $"barber-{Guid.NewGuid():N}";

        var url = await storage.SaveAsync(shopId, kind, "me.png", "image/png", Png, CancellationToken.None);

        Assert.Equal($"/api/public/shop-media/{shopId:D}/{kind}", url);
        var media = await storage.OpenAsync(shopId, kind, CancellationToken.None);
        Assert.NotNull(media);
        await using var stream = media.Stream;
        Assert.Equal("image/png", media.ContentType);
    }

    [Fact]
    public async Task ExposesLastModifiedSoTheApiCanServeCacheValidators()
    {
        var shopId = Guid.NewGuid();
        var before = DateTimeOffset.UtcNow.AddMinutes(-1);
        await storage.SaveAsync(shopId, "logo", "l.png", "image/png", Png, CancellationToken.None);

        var media = await storage.OpenAsync(shopId, "logo", CancellationToken.None);

        Assert.NotNull(media);
        await using var stream = media.Stream;
        Assert.NotNull(media.LastModifiedUtc);
        Assert.InRange(media.LastModifiedUtc.Value, before, DateTimeOffset.UtcNow.AddMinutes(1));
    }

    [Theory]
    [InlineData("barber-../../secrets")]
    [InlineData("barber-123")]
    [InlineData("barber-00000000000000000000000000000000/x")]
    [InlineData("Barber_00000000000000000000000000000000")]
    [InlineData("avatar")]
    public async Task RejectsKindsThatAreNotLogoCoverOrABarberId(string kind)
    {
        var error = await Assert.ThrowsAsync<ArgumentException>(() => storage.SaveAsync(Guid.NewGuid(), kind, "x.png", "image/png", Png, CancellationToken.None));
        Assert.Equal("MEDIA_KIND_INVALID", error.Message);
    }

    [Fact]
    public async Task BarberPortraitsAreLimitedToTwoMegabytes()
    {
        var oversized = new byte[2 * 1024 * 1024 + 1];
        Png.CopyTo(oversized, 0);
        var error = await Assert.ThrowsAsync<ArgumentException>(() => storage.SaveAsync(Guid.NewGuid(), $"barber-{Guid.NewGuid():N}", "x.png", "image/png", oversized, CancellationToken.None));
        Assert.Equal("MEDIA_TOO_LARGE", error.Message);
    }

    public void Dispose()
    {
        if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
    }
}
