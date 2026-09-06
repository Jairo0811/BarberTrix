using BarberTrix.Application.Discovery;
using Microsoft.Extensions.Configuration;

namespace BarberTrix.Infrastructure.Discovery;

public sealed class ShopMediaStorage(IConfiguration configuration) : IShopMediaStorage
{
    private readonly string rootPath = Path.GetFullPath(configuration["ShopMedia:RootPath"] ?? Path.Combine(AppContext.BaseDirectory, "data", "shop-media"));

    public async Task<string> SaveAsync(Guid shopId, string kind, string fileName, string contentType, byte[] content, CancellationToken cancellationToken)
    {
        var normalizedKind = NormalizeKind(kind);
        var maxBytes = normalizedKind == "logo" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (content.Length == 0) throw new ArgumentException("MEDIA_EMPTY");
        if (content.Length > maxBytes) throw new ArgumentException("MEDIA_TOO_LARGE");
        var detected = DetectContentType(content);
        if (detected is null || !string.Equals(detected, contentType, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("MEDIA_TYPE_INVALID");

        var directory = Path.Combine(rootPath, shopId.ToString("N"));
        Directory.CreateDirectory(directory);
        // A single canonical filename makes format changes atomic too. Readers never
        // observe a partial file; old extension-based files remain readable until replaced.
        var temporary = Path.Combine(directory, Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            await File.WriteAllBytesAsync(temporary, content, cancellationToken);
            cancellationToken.ThrowIfCancellationRequested();
            File.Move(temporary, Path.Combine(directory, normalizedKind + ".image"), overwrite: true);
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
        return $"/api/public/shop-media/{shopId:D}/{normalizedKind}";
    }

    public async Task<StoredShopMedia?> OpenAsync(Guid shopId, string kind, CancellationToken cancellationToken)
    {
        var normalizedKind = NormalizeKind(kind);
        var directory = Path.Combine(rootPath, shopId.ToString("N"));
        // Never enumerate arbitrary files, temporary writes, or caller-supplied names.
        foreach (var extension in new[] { ".image", ".jpg", ".png", ".webp" })
        {
            var path = Path.Combine(directory, normalizedKind + extension);
            if (!File.Exists(path)) continue;
            var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete);
            try
            {
                var header = new byte[12];
                var count = await stream.ReadAsync(header, cancellationToken);
                var type = DetectContentType(header.AsSpan(0, count));
                if (type is null) { await stream.DisposeAsync(); return null; }
                stream.Position = 0;
                return new StoredShopMedia(stream, type);
            }
            catch { await stream.DisposeAsync(); throw; }
        }
        return null;
    }

    private static string? DetectContentType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff) return "image/jpeg";
        if (bytes.StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return "image/png";
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes.Slice(8, 4).SequenceEqual("WEBP"u8)) return "image/webp";
        return null;
    }

    private static string NormalizeKind(string kind) => kind?.Trim().ToLowerInvariant() switch
    {
        "logo" => "logo",
        "cover" => "cover",
        _ => throw new ArgumentException("MEDIA_KIND_INVALID")
    };
}
