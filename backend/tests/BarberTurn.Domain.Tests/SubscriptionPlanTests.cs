using BarberTurn.Domain.Entities;

namespace BarberTurn.Domain.Tests;

public sealed class SubscriptionPlanTests
{
    [Fact]
    public void NewBarberShopStartsOnPermanentFreePlan()
    {
        var shop = new BarberShop("BarberTurn Test", "barberturn-test");

        Assert.Equal(SubscriptionPlan.Free, shop.Plan);
        Assert.Equal(SubscriptionStatus.Active, shop.SubscriptionStatus);
        Assert.Null(shop.TrialEndsAtUtc);
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
