namespace BarberTurn.Domain.Entities;

public enum BarberStatus
{
    Available = 1,
    Busy = 2,
    Break = 3,
    Offline = 4
}

public sealed class Barber : BaseEntity
{
    private Barber() { }

    public Barber(Guid barberShopId, string name, int chairNumber)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (chairNumber <= 0)
            throw new ArgumentOutOfRangeException(nameof(chairNumber), "Chair number must be greater than zero.");

        BarberShopId = barberShopId;
        Name = name.Trim();
        ChairNumber = chairNumber;
        Status = BarberStatus.Available;
    }

    public Guid BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int ChairNumber { get; private set; }
    public BarberStatus Status { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void ChangeStatus(BarberStatus status)
    {
        Status = status;
        Touch();
    }
}

public sealed class BarberService : BaseEntity
{
    private BarberService() { }

    public BarberService(Guid barberShopId, string name, decimal price, int estimatedDurationMinutes, string? description = null)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (price < 0)
            throw new ArgumentOutOfRangeException(nameof(price), "Price cannot be negative.");
        if (estimatedDurationMinutes <= 0)
            throw new ArgumentOutOfRangeException(nameof(estimatedDurationMinutes), "Estimated duration must be greater than zero.");

        BarberShopId = barberShopId;
        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        Price = price;
        EstimatedDurationMinutes = estimatedDurationMinutes;
    }

    public Guid BarberShopId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public decimal Price { get; private set; }
    public int EstimatedDurationMinutes { get; private set; }
    public bool IsActive { get; private set; } = true;
}

public enum TurnStatus
{
    Waiting = 1,
    Called = 2,
    InService = 3,
    Completed = 4,
    Cancelled = 5,
    NoShow = 6
}

public sealed class Turn : BaseEntity
{
    private Turn() { }

    public Turn(
        Guid barberShopId,
        Guid serviceId,
        DateOnly queueDate,
        int sequenceNumber,
        string? customerName = null,
        Guid? barberId = null)
    {
        if (barberShopId == Guid.Empty)
            throw new ArgumentException("Barbershop is required.", nameof(barberShopId));
        if (serviceId == Guid.Empty)
            throw new ArgumentException("Service is required.", nameof(serviceId));
        if (sequenceNumber <= 0)
            throw new ArgumentOutOfRangeException(nameof(sequenceNumber));

        BarberShopId = barberShopId;
        ServiceId = serviceId;
        BarberId = barberId;
        QueueDate = queueDate;
        SequenceNumber = sequenceNumber;
        CustomerName = string.IsNullOrWhiteSpace(customerName) ? null : customerName.Trim();
        Status = TurnStatus.Waiting;
    }

    public Guid BarberShopId { get; private set; }
    public Guid ServiceId { get; private set; }
    public Guid? BarberId { get; private set; }
    public DateOnly QueueDate { get; private set; }
    public int SequenceNumber { get; private set; }
    public string TicketNumber => $"A-{SequenceNumber:000}";
    public string? CustomerName { get; private set; }
    public TurnStatus Status { get; private set; }
    public DateTimeOffset? CalledAtUtc { get; private set; }
    public DateTimeOffset? ServiceStartedAtUtc { get; private set; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }

    public void AssignBarber(Guid barberId)
    {
        EnsureNotTerminal();
        if (barberId == Guid.Empty)
            throw new ArgumentException("Barber is required.", nameof(barberId));

        BarberId = barberId;
        Touch();
    }

    public void Call(Guid barberId)
    {
        EnsureStatus(TurnStatus.Waiting);
        AssignBarber(barberId);
        Status = TurnStatus.Called;
        CalledAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void StartService()
    {
        EnsureStatus(TurnStatus.Called);
        if (BarberId is null)
            throw new InvalidOperationException("A barber must be assigned before starting service.");

        Status = TurnStatus.InService;
        ServiceStartedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void Complete()
    {
        EnsureStatus(TurnStatus.InService);
        Status = TurnStatus.Completed;
        CompletedAtUtc = DateTimeOffset.UtcNow;
        Touch();
    }

    public void Cancel()
    {
        if (Status is not (TurnStatus.Waiting or TurnStatus.Called))
            throw new InvalidOperationException($"A turn in status {Status} cannot be cancelled.");

        Status = TurnStatus.Cancelled;
        Touch();
    }

    public void MarkNoShow()
    {
        EnsureStatus(TurnStatus.Called);
        Status = TurnStatus.NoShow;
        Touch();
    }

    private void EnsureStatus(TurnStatus expected)
    {
        if (Status != expected)
            throw new InvalidOperationException($"Expected turn status {expected}, but current status is {Status}.");
    }

    private void EnsureNotTerminal()
    {
        if (Status is TurnStatus.Completed or TurnStatus.Cancelled or TurnStatus.NoShow)
            throw new InvalidOperationException($"A turn in terminal status {Status} cannot be modified.");
    }
}
