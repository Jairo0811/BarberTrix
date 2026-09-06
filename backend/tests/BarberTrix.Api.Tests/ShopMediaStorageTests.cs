using BarberTrix.Infrastructure.Discovery;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BarberTrix.Api.Tests;

public sealed class ShopMediaStorageTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "barbertrix-media-tests", Guid.NewGuid().ToString("N"));
    private ShopMediaStorage Storage => new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ShopMedia:RootPath"] = root }).Build());
    public static TheoryData<string, byte[]> Images => new()
    {
        { "image/jpeg", [255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 255, 217] },
        { "image/png", [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0] },
        { "image/webp", [82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80] }
    };

    [Theory, MemberData(nameof(Images))]
    public async Task SignatureValidatedMediaCanBeReadOnlyFromItsShop(string mime, byte[] bytes)
    {
        var id = Guid.NewGuid();
        await Storage.SaveAsync(id, "logo", "../../unsafe.exe", mime, bytes, default);
        var result = await Storage.OpenAsync(id, "logo", default);
        Assert.NotNull(result);
        await using var stream = result.Stream;
        Assert.Equal(mime, result.ContentType);
        using var copy = new MemoryStream();
        await stream.CopyToAsync(copy);
        Assert.Equal(bytes, copy.ToArray());
        Assert.Null(await Storage.OpenAsync(Guid.NewGuid(), "logo", default));
        Assert.Single(Directory.GetFiles(root, "*", SearchOption.AllDirectories));
    }

    [Fact]
    public async Task RejectedOrCancelledReplacementPreservesExistingImage()
    {
        var id = Guid.NewGuid();
        byte[] png = [137, 80, 78, 71, 13, 10, 26, 10];
        await Storage.SaveAsync(id, "logo", "logo.png", "image/png", png, default);
        await Assert.ThrowsAsync<ArgumentException>(() => Storage.SaveAsync(id, "logo", "x.jpg", "image/jpeg", png, default));
        await Assert.ThrowsAsync<ArgumentException>(() => Storage.SaveAsync(id, "logo", "x.png", "image/png", [], default));
        await Assert.ThrowsAsync<ArgumentException>(() => Storage.SaveAsync(id, "logo", "x.png", "image/png", new byte[2 * 1024 * 1024 + 1], default));
        await Assert.ThrowsAsync<ArgumentException>(() => Storage.SaveAsync(id, "../logo", "x.png", "image/png", png, default));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Storage.SaveAsync(id, "logo", "x.png", "image/png", png, new CancellationToken(true)));
        var existing = await Storage.OpenAsync(id, "logo", default);
        Assert.NotNull(existing);
        await existing.Stream.DisposeAsync();
        Assert.Empty(Directory.GetFiles(root, "*.tmp", SearchOption.AllDirectories));
    }

    public void Dispose() { if (Directory.Exists(root)) Directory.Delete(root, recursive: true); }
}
