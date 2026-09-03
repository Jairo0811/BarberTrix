using BarberTrix.Domain.Entities;

namespace BarberTrix.Domain.Tests;

public sealed class SubscriptionPlanTests
{
    [Fact]
    public void NewBarberShopStartsOnPermanentFreePlan()
    {
        var shop = new BarberShop("BarberTrix Test", "barbertrix-test");

        Assert.Equal(SubscriptionPlan.Free, shop.Plan);
        Assert.Equal(SubscriptionStatus.Active, shop.SubscriptionStatus);
        Assert.Null(shop.TrialEndsAtUtc);
    }

    [Fact]
    public void PaidSubscriptionChangesPlanAndStatus()
    {
        var shop = new BarberShop("BarberTrix Test", "barbertrix-test");

        shop.ChangeSubscription(SubscriptionPlan.Pro, SubscriptionStatus.Active);

        Assert.Equal(SubscriptionPlan.Pro, shop.Plan);
        Assert.Equal(SubscriptionStatus.Active, shop.SubscriptionStatus);
    }

    [Fact]
    public void LegacyStarterNormalizesToFreeWithoutRenumberingStoredPlans()
    {
        Assert.Equal(1, (int)SubscriptionPlan.Starter);
        Assert.Equal(SubscriptionPlan.Free, SubscriptionPlan.Starter.NormalizeCommercial());
        Assert.Equal(SubscriptionPlan.Pro, SubscriptionPlan.Pro.NormalizeCommercial());
        Assert.Equal(SubscriptionPlan.Business, SubscriptionPlan.Business.NormalizeCommercial());
    }

    [Theory]
    [InlineData(SubscriptionPlan.Free, false)]
    [InlineData(SubscriptionPlan.Starter, false)]
    [InlineData(SubscriptionPlan.Pro, true)]
    [InlineData(SubscriptionPlan.Business, true)]
    public void OnlyCurrentPaidPlansArePurchasable(SubscriptionPlan plan, bool expected)
    {
        Assert.Equal(expected, plan.IsPurchasable());
    }
}
