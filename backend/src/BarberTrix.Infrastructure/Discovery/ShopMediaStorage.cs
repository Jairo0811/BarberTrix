using BarberTrix.Application.Discovery;
using Microsoft.Extensions.Configuration;

namespace BarberTrix.Infrastructure.Discovery;

public sealed class ShopMediaStorage(IConfiguration configuration) : IShopMediaStorage
{
    private static readonly IReadOnlyDictionary<string, string> AllowedContentTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp"
    };

    private readonly string rootPath = Path.GetFullPath(configuration["ShopMedia:RootPath"] ?? Path.Combine(AppContext.BaseDirectory, "data", "shop-media"));

    public async Task<string> SaveAsync(Guid shopId, string kind, string fileName, string contentType, byte[] content, CancellationToken cancellationToken)
    {
        var normalizedKind = NormalizeKind(kind);
        if (!AllowedContentTypes.TryGetValue(contentType, out var extension))
            throw new ArgumentException("Only JPG, PNG and WEBP images are supported.", nameof(contentType));

        var maxBytes = normalizedKind == "logo" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (content.Length == 0 || content.Length > maxBytes)
            throw new ArgumentException(normalizedKind == "logo" ? "The logo must be 2 MB or smaller." : "The cover image must be 5 MB or smaller.", nameof(content));

        Directory.CreateDirectory(rootPath);
        var shopDirectory = Path.Combine(rootPath, shopId.ToString("N"));
        Directory.CreateDirectory(shopDirectory);
        DeleteExisting(shopDirectory, normalizedKind);

        var path = Path.Combine(shopDirectory, normalizedKind + extension);
        await File.WriteAllBytesAsync(path, content, cancellationToken);
        return $"/api/public/shop-media/{shopId:D}/{normalizedKind}";
    }

    public Task<StoredShopMedia?> OpenAsync(Guid shopId, string kind, CancellationToken cancellationToken)
    {
        var normalizedKind = NormalizeKind(kind);
        var shopDirectory = Path.Combine(rootPath, shopId.ToString("N"));
        if (!Directory.Exists(shopDirectory)) return Task.FromResult<StoredShopMedia?>(null);

        var path = Directory.EnumerateFiles(shopDirectory, normalizedKind + ".*").FirstOrDefault();
        if (path is null) return Task.FromResult<StoredShopMedia?>(null);

        var extension = Path.GetExtension(path).ToLowerInvariant();
        var contentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
        Stream stream = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<StoredShopMedia?>(new StoredShopMedia(stream, contentType));
    }

    private static string NormalizeKind(string kind) => kind.Trim().ToLowerInvariant() switch
    {
        "logo" => "logo",
        "cover" => "cover",
        _ => throw new ArgumentException("Media kind must be logo or cover.", nameof(kind))
    };

    private static void DeleteExisting(string directory, string kind)
    {
        foreach (var file in Directory.EnumerateFiles(directory, kind + ".*")) File.Delete(file);
    }
}
