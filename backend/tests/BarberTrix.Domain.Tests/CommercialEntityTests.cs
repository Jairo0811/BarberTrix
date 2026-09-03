using BarberTrix.Domain.Entities;

namespace BarberTrix.Domain.Tests;

public sealed class CommercialEntityTests
{
    [Fact]
    public void AppointmentCannotEndBeforeItStarts()
    {
        var starts = DateTimeOffset.UtcNow.AddDays(1);
        Assert.Throws<ArgumentException>(() => new Appointment(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), starts, starts.AddMinutes(-1),
            "Cliente", null, null, "lookup-hash"));
    }

    [Fact]
    public void ConfirmedAppointmentSupportsExpectedLifecycle()
    {
        var starts = DateTimeOffset.UtcNow.AddDays(1);
        var appointment = new Appointment(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), starts, starts.AddMinutes(30),
            "Cliente", null, null, "lookup-hash");

        appointment.CheckIn();
        appointment.Complete();

        Assert.Equal(AppointmentStatus.Completed, appointment.Status);
        Assert.Throws<InvalidOperationException>(appointment.Cancel);
    }

    [Fact]
    public void PasswordChangeRotatesSecurityStamp()
    {
        var user = new User(Guid.NewGuid(), "Owner", "owner@example.com", "hash-one", UserRole.Owner);
        var originalStamp = user.SecurityStamp;

        user.ChangePasswordHash("hash-two");

        Assert.NotEqual(originalStamp, user.SecurityStamp);
    }

    [Fact]
    public void LocationNormalizesSlugAndCanBeDisabled()
    {
        var location = new ShopLocation(Guid.NewGuid(), "Centro", "  CENTRO  ", null, "America/Santo_Domingo");

        location.SetActive(false);

        Assert.Equal("centro", location.Slug);
        Assert.False(location.IsActive);
    }

    [Fact]
    public void CashPaymentStartsPaid()
    {
        var payment = new PaymentRecord(Guid.NewGuid(), 500, "dop", PaymentMethod.Cash, null, null, null, null);

        Assert.Equal(PaymentStatus.Paid, payment.Status);
        Assert.Equal("DOP", payment.Currency);
        Assert.NotNull(payment.PaidAtUtc);
    }
}
