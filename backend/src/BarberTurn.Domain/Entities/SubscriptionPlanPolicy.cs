namespace BarberTurn.Domain.Entities;

public static class SubscriptionPlanPolicy
{
    public static SubscriptionPlan NormalizeCommercial(this SubscriptionPlan plan) =>
        plan == SubscriptionPlan.Starter ? SubscriptionPlan.Free : plan;

    public static bool IsPurchasable(this SubscriptionPlan plan) =>
        plan is SubscriptionPlan.Pro or SubscriptionPlan.Business;
}
