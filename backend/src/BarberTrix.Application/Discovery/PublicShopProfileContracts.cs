namespace BarberTrix.Application.Discovery;

public sealed record PublicShopLocationDto(
    string? Address,
    string? City,
    string? Neighborhood,
    string? Reference,
    decimal? Latitude,
    decimal? Longitude);

public sealed record PublicShopProfileDto(
    string? Description,
    string? PublicPhone,
    string? WhatsAppPhone,
    string? LogoUrl,
    string? CoverImageUrl,
    PublicShopLocationDto Location,
    bool AcceptsWalkIns,
    bool AcceptsAppointments,
    bool IsPublished,
    DateTimeOffset? PublishedAtUtc,
    IReadOnlyList<string> PublicationIssues);

public sealed record UpdatePublicShopProfileRequest(
    string? Description,
    string? PublicPhone,
    string? WhatsAppPhone,
    string? LogoUrl,
    string? CoverImageUrl,
    string? Address,
    string? City,
    string? Neighborhood,
    string? Reference,
    decimal? Latitude,
    decimal? Longitude,
    bool AcceptsWalkIns,
    bool AcceptsAppointments);

public sealed record UploadShopMediaRequest(string FileName, string ContentType, string Base64);
public sealed record ShopMediaUploadResponse(string Url);
public sealed record StoredShopMedia(Stream Stream, string ContentType);

public interface IShopMediaStorage
{
    Task<string> SaveAsync(Guid shopId, string kind, string fileName, string contentType, byte[] content, CancellationToken cancellationToken);
    Task<StoredShopMedia?> OpenAsync(Guid shopId, string kind, CancellationToken cancellationToken);
}

public interface IPublicShopProfileService
{
    Task<PublicShopProfileDto> GetAsync(Guid shopId, CancellationToken cancellationToken);
    Task<PublicShopProfileDto> UpdateAsync(Guid shopId, UpdatePublicShopProfileRequest request, CancellationToken cancellationToken);
    Task<PublicShopProfileDto> SetPublishedAsync(Guid shopId, bool published, CancellationToken cancellationToken);
}
