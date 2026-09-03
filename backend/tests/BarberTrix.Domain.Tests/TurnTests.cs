using BarberTrix.Domain.Entities;

namespace BarberTrix.Domain.Tests;

public sealed class TurnTests
{
    [Fact]
    public void NewTurnStartsWaitingAndFormatsTicketNumber()
    {
        var turn = CreateTurn(sequenceNumber: 7);

        Assert.Equal(TurnStatus.Waiting, turn.Status);
        Assert.Equal("A-007", turn.TicketNumber);
        Assert.Null(turn.BarberId);
    }

    [Fact]
    public void CallStartAndCompleteFollowValidLifecycle()
    {
        var barberId = Guid.NewGuid();
        var turn = CreateTurn();

        turn.Call(barberId);
        Assert.Equal(TurnStatus.Called, turn.Status);
        Assert.Equal(barberId, turn.BarberId);
        Assert.NotNull(turn.CalledAtUtc);

        turn.StartService();
        Assert.Equal(TurnStatus.InService, turn.Status);
        Assert.NotNull(turn.ServiceStartedAtUtc);

        turn.Complete();
        Assert.Equal(TurnStatus.Completed, turn.Status);
        Assert.NotNull(turn.CompletedAtUtc);
    }

    [Fact]
    public void CancelWaitingTurnBecomesCancelled()
    {
        var turn = CreateTurn();

        turn.Cancel();

        Assert.Equal(TurnStatus.Cancelled, turn.Status);
    }

    [Fact]
    public void MarkNoShowCalledTurnBecomesNoShow()
    {
        var turn = CreateTurn();
        turn.Call(Guid.NewGuid());

        turn.MarkNoShow();

        Assert.Equal(TurnStatus.NoShow, turn.Status);
    }

    [Fact]
    public void StartServiceWithoutCallingThrows()
    {
        var turn = CreateTurn();

        Assert.Throws<InvalidOperationException>(turn.StartService);
    }

    [Fact]
    public void CompletedTurnCannotBeAssignedAgain()
    {
        var turn = CreateTurn();
        turn.Call(Guid.NewGuid());
        turn.StartService();
        turn.Complete();

        Assert.Throws<InvalidOperationException>(() => turn.AssignBarber(Guid.NewGuid()));
    }

    private static Turn CreateTurn(int sequenceNumber = 1) =>
        new(Guid.NewGuid(), Guid.NewGuid(), DateOnly.FromDateTime(DateTime.UtcNow), sequenceNumber);
}
