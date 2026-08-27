using BarberTurn.Domain.Entities;

namespace BarberTurn.Domain.Tests;

public sealed class SubscriptionPlanTests
{
    [Fact]
    public void NewBarberShopStartsOnStarterTrial()
    {
        var shop = new BarberShop("BarberTurn Test", "barberturn-test");

        Assert.Equal(SubscriptionPlan.Starter, shop.Plan);
        Assert.Equal(SubscriptionStatus.Trialing, shop.SubscriptionStatus);
        Assert.NotNull(shop.TrialEndsAtUtc);
        Assert.True(shop.TrialEndsAtUtc > DateTimeOffset.UtcNow);
    }

    [Fact]
    public void PaidSubscriptionChangesPlanAndStatus()
    {
        var shop = new BarberShop("BarberTurn Test", "barberturn-test");

        shop.ChangeSubscription(SubscriptionPlan.Pro, SubscriptionStatus.Active);

        Assert.Equal(SubscriptionPlan.Pro, shop.Plan);
        Assert.Equal(SubscriptionStatus.Active, shop.SubscriptionStatus);
    }
}
