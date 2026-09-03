namespace BarberTrix.Application.Discovery;

public sealed record PublicShopProfileDto(
    string? Description,
    string? PublicPhone,
    string? WhatsAppPhone,
    string? LogoUrl,
    string? CoverImageUrl,
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
    bool AcceptsWalkIns,
    bool AcceptsAppointments);

public interface IPublicShopProfileService
{
    Task<PublicShopProfileDto> GetAsync(Guid shopId, CancellationToken cancellationToken);
    Task<PublicShopProfileDto> UpdateAsync(Guid shopId, UpdatePublicShopProfileRequest request, CancellationToken cancellationToken);
    Task<PublicShopProfileDto> SetPublishedAsync(Guid shopId, bool published, CancellationToken cancellationToken);
}
