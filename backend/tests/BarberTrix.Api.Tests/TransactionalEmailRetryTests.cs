using BarberTrix.Infrastructure.Common;
using Xunit;

namespace BarberTrix.Api.Tests;

public sealed class TransactionalEmailRetryTests
{
    private static readonly TimeSpan[] NoDelay = [TimeSpan.Zero, TimeSpan.Zero];

    [Fact]
    public async Task SucceedsOnFirstAttemptWithoutReportingFailures()
    {
        var calls = 0;
        var delivered = await TransactionalEmailSender.TrySendWithRetryAsync(
            _ => { calls++; return Task.CompletedTask; }, NoDelay, (_, _) => Assert.Fail("no failure expected"), CancellationToken.None);

        Assert.True(delivered);
        Assert.Equal(1, calls);
    }

    [Fact]
    public async Task RetriesTransientFailuresThenSucceeds()
    {
        var calls = 0;
        var failures = new List<int>();
        var delivered = await TransactionalEmailSender.TrySendWithRetryAsync(
            _ => ++calls < 3 ? Task.FromException(new IOException("smtp down")) : Task.CompletedTask,
            NoDelay, (attempt, _) => failures.Add(attempt), CancellationToken.None);

        Assert.True(delivered);
        Assert.Equal(3, calls);
        Assert.Equal([1, 2], failures);
    }

    [Fact]
    public async Task GivesUpAfterAllAttemptsWithoutThrowing()
    {
        var calls = 0;
        var delivered = await TransactionalEmailSender.TrySendWithRetryAsync(
            _ => { calls++; return Task.FromException(new IOException("smtp down")); }, NoDelay, (_, _) => { }, CancellationToken.None);

        Assert.False(delivered);
        Assert.Equal(3, calls);
    }

    [Fact]
    public async Task CancellationIsNotSwallowed()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => TransactionalEmailSender.TrySendWithRetryAsync(
            ct => { ct.ThrowIfCancellationRequested(); return Task.CompletedTask; }, NoDelay, (_, _) => { }, cts.Token));
    }
}
