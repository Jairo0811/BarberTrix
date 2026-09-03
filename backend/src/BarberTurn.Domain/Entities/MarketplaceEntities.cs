namespace BarberTurn.Domain.Entities;

public sealed class PublicShopProfile : BaseEntity
{
    private PublicShopProfile() { }

    public PublicShopProfile(Guid barberShopId)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        BarberShopId = barberShopId;
    }

    public Guid BarberShopId { get; private set; }
    public string? Description { get; private set; }
    public string? PublicPhone { get; private set; }
    public string? WhatsAppPhone { get; private set; }
    public string? LogoUrl { get; private set; }
    public string? CoverImageUrl { get; private set; }
    public bool AcceptsWalkIns { get; private set; } = true;
    public bool AcceptsAppointments { get; private set; } = true;
    public bool IsPublished { get; private set; }
    public DateTimeOffset? PublishedAtUtc { get; private set; }

    public void Update(string? description, string? publicPhone, string? whatsAppPhone, string? logoUrl, string? coverImageUrl, bool acceptsWalkIns, bool acceptsAppointments)
    {
        if (!acceptsWalkIns && !acceptsAppointments)
            throw new ArgumentException("At least one booking mode must be enabled.");
        Description = Normalize(description, 1000, nameof(description));
        PublicPhone = Normalize(publicPhone, 40, nameof(publicPhone));
        WhatsAppPhone = Normalize(whatsAppPhone, 40, nameof(whatsAppPhone));
        LogoUrl = NormalizeUrl(logoUrl, nameof(logoUrl));
        CoverImageUrl = NormalizeUrl(coverImageUrl, nameof(coverImageUrl));
        AcceptsWalkIns = acceptsWalkIns;
        AcceptsAppointments = acceptsAppointments;
        Touch();
    }

    public void Publish()
    {
        IsPublished = true;
        PublishedAtUtc ??= DateTimeOffset.UtcNow;
        Touch();
    }

    public void Unpublish()
    {
        IsPublished = false;
        Touch();
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
}
