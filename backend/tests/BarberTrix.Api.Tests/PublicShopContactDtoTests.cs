using BarberTrix.Application.Discovery;
using BarberTrix.Application.Queue;
using Xunit;

namespace BarberTrix.Api.Tests;

public sealed class PublicShopContactDtoTests
{
    [Fact]
    public void FromCopiesOnlyThePublicContactFields()
    {
        var profile = new PublicShopProfileDto(
            "Cortes clásicos", "809-555-0100", "18095550101", "/api/public/shop-media/x/logo", "/api/public/shop-media/x/cover",
            new PublicShopLocationDto("Calle 1 #2", "Santo Domingo", "Naco", "Frente al parque", 18.47m, -69.93m),
            true, true, true, DateTimeOffset.UtcNow, ["internal issue"]);

        var contact = PublicShopContactDto.From(profile);

        Assert.Equal("Cortes clásicos", contact.Description);
        Assert.Equal("18095550101", contact.WhatsAppPhone);
        Assert.Equal("809-555-0100", contact.PublicPhone);
        Assert.Equal("/api/public/shop-media/x/logo", contact.LogoUrl);
        Assert.Equal("Calle 1 #2", contact.Address);
        Assert.Equal("Santo Domingo", contact.City);
        Assert.Equal(18.47m, contact.Latitude);
        Assert.Equal(-69.93m, contact.Longitude);
    }
}
