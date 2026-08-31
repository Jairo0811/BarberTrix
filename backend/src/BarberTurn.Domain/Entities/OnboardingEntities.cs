namespace BarberTurn.Domain.Entities;

public enum BarberJoinRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Withdrawn = 4
}

public sealed class BarberJoinRequest : BaseEntity
{
    private BarberJoinRequest() { }

    public BarberJoinRequest(Guid userId, Guid barberShopId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("User is required.", nameof(userId));
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));

        UserId = userId;
        BarberShopId = barberShopId;
        Status = BarberJoinRequestStatus.Pending;
    }

    public Guid UserId { get; private set; }
    public Guid BarberShopId { get; private set; }
    public BarberJoinRequestStatus Status { get; private set; }
    public Guid? ReviewedByUserId { get; private set; }
    public DateTimeOffset? ReviewedAtUtc { get; private set; }
    public string? ReviewNote { get; private set; }

    public void Reopen()
    {
        if (Status == BarberJoinRequestStatus.Approved)
            throw new InvalidOperationException("An approved request cannot be reopened.");
        Status = BarberJoinRequestStatus.Pending;
        ReviewedByUserId = null;
        ReviewedAtUtc = null;
        ReviewNote = null;
        Touch();
    }

    public void Approve(Guid reviewerUserId)
    {
        EnsurePending();
        if (reviewerUserId == Guid.Empty)
            throw new ArgumentException("Reviewer is required.", nameof(reviewerUserId));
        Status = BarberJoinRequestStatus.Approved;
        ReviewedByUserId = reviewerUserId;
        ReviewedAtUtc = DateTimeOffset.UtcNow;
        ReviewNote = null;
        Touch();
    }

    public void Reject(Guid reviewerUserId, string? note)
    {
        EnsurePending();
        if (reviewerUserId == Guid.Empty)
            throw new ArgumentException("Reviewer is required.", nameof(reviewerUserId));
        Status = BarberJoinRequestStatus.Rejected;
        ReviewedByUserId = reviewerUserId;
        ReviewedAtUtc = DateTimeOffset.UtcNow;
        ReviewNote = Trim(note, 500);
        Touch();
    }

    public void Withdraw()
    {
        EnsurePending();
        Status = BarberJoinRequestStatus.Withdrawn;
        ReviewedAtUtc = DateTimeOffset.UtcNow;
        ReviewNote = null;
        Touch();
    }

    private void EnsurePending()
    {
        if (Status != BarberJoinRequestStatus.Pending)
            throw new InvalidOperationException("Only a pending request can be changed.");
    }

    private static string? Trim(string? value, int length) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, length)];
}
