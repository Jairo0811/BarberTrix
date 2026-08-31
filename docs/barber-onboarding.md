# Barber onboarding and shop membership

Stage D separates a professional barber identity from barbershop membership.

## Flow

1. An independent barber registers and receives an onboarding-scoped session.
2. The barber searches active barbershops and creates a `BarberJoinRequest`.
3. Owners/administrators review pending requests inside their own tenant only.
4. Approval creates the operational `Barber`, activates a `ShopMembership`, and assigns the user to the tenant.
5. The barber refreshes the session and receives tenant claims (`barbershop_id`, role and `barber_id`).
6. Rejection or withdrawal leaves the professional identity independent and reusable.

`BarberJoinRequest` is deliberately separate from `ShopMembership`: a request is intent; a membership is an accepted relationship.
