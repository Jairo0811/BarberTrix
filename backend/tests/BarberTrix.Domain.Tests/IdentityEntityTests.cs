using BarberTrix.Domain.Entities;

namespace BarberTrix.Domain.Tests;

public sealed class IdentityEntityTests
{
    [Fact]
    public void BarberProfileRequiresUserAndDisplayName()
    {
        Assert.Throws<ArgumentException>(() => new BarberProfile(Guid.Empty, "Carlos"));
        Assert.Throws<ArgumentException>(() => new BarberProfile(Guid.NewGuid(), " "));
    }

    [Fact]
    public void BarberProfileUpdatesProfessionalData()
    {
        var profile = new BarberProfile(Guid.NewGuid(), " Carlos ");

        profile.Update("Carlos M.", "Barbero especializado en fades.", true);

        Assert.Equal("Carlos M.", profile.DisplayName);
        Assert.Equal("Barbero especializado en fades.", profile.Bio);
        Assert.True(profile.IsAvailableForWork);
    }

    [Fact]
    public void BarberMembershipRequiresOperationalBarberLink()
    {
        Assert.Throws<ArgumentException>(() => new ShopMembership(
            Guid.NewGuid(),
            Guid.NewGuid(),
            UserRole.Barber));
    }

    [Fact]
    public void OwnerMembershipDoesNotKeepBarberLink()
    {
        var membership = new ShopMembership(
            Guid.NewGuid(),
            Guid.NewGuid(),
            UserRole.Owner,
            Guid.NewGuid());

        Assert.Null(membership.BarberId);
        Assert.True(membership.IsActive);
    }

    [Fact]
    public void MembershipCanBeSuspendedAndReactivated()
    {
        var membership = new ShopMembership(
            Guid.NewGuid(),
            Guid.NewGuid(),
            UserRole.Receptionist);

        membership.Suspend();
        Assert.Equal(ShopMembershipStatus.Suspended, membership.Status);
        Assert.False(membership.IsActive);

        membership.Activate();
        Assert.Equal(ShopMembershipStatus.Active, membership.Status);
        Assert.True(membership.IsActive);
    }

    [Fact]
    public void EndedMembershipCannotBeSuspended()
    {
        var membership = new ShopMembership(
            Guid.NewGuid(),
            Guid.NewGuid(),
            UserRole.Administrator);

        membership.Leave();

        Assert.Equal(ShopMembershipStatus.Left, membership.Status);
        Assert.NotNull(membership.EndedAtUtc);
        Assert.Throws<InvalidOperationException>(() => membership.Suspend());
    }

    [Fact]
    public void PasswordHashUpgradePreservesSecurityStamp()
    {
        var user = User.CreateClient("Client", "client@example.com", "old-hash");
        var originalStamp = user.SecurityStamp;

        user.UpgradePasswordHash("new-hash");

        Assert.Equal("new-hash", user.PasswordHash);
        Assert.Equal(originalStamp, user.SecurityStamp);
        Assert.NotNull(user.UpdatedAtUtc);
    }

    [Fact]
    public void PasswordChangeRotatesSecurityStamp()
    {
        var user = User.CreateClient("Client", "client@example.com", "old-hash");
        var originalStamp = user.SecurityStamp;

        user.ChangePasswordHash("new-hash");

        Assert.Equal("new-hash", user.PasswordHash);
        Assert.NotEqual(originalStamp, user.SecurityStamp);
    }
}
