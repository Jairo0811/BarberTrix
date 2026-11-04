using BarberTrix.Infrastructure.Auth;
using Xunit;

namespace BarberTrix.Api.Tests;

public sealed class LoginAttemptGuardTests
{
    private sealed class ManualClock(DateTimeOffset start) : TimeProvider
    {
        private DateTimeOffset now = start;
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan by) => now += by;
    }

    private static (LoginAttemptGuard Guard, ManualClock Clock) Create()
    {
        var clock = new ManualClock(new DateTimeOffset(2026, 11, 4, 12, 0, 0, TimeSpan.Zero));
        return (new LoginAttemptGuard(clock), clock);
    }

    [Fact]
    public void Blocks_after_eight_failures_and_is_case_insensitive()
    {
        var (guard, _) = Create();
        for (var i = 0; i < 7; i++) guard.RecordFailure("ana@example.com");
        Assert.False(guard.IsBlocked("ana@example.com"));

        guard.RecordFailure("ANA@example.com");
        Assert.True(guard.IsBlocked("ana@example.com"));
        Assert.False(guard.IsBlocked("otra@example.com"));
    }

    [Fact]
    public void Unblocks_after_the_window_expires()
    {
        var (guard, clock) = Create();
        for (var i = 0; i < 8; i++) guard.RecordFailure("ana@example.com");
        Assert.True(guard.IsBlocked("ana@example.com"));

        clock.Advance(TimeSpan.FromMinutes(15));
        Assert.False(guard.IsBlocked("ana@example.com"));
    }

    [Fact]
    public void Successful_login_resets_the_counter()
    {
        var (guard, _) = Create();
        for (var i = 0; i < 8; i++) guard.RecordFailure("ana@example.com");
        guard.Reset("ana@example.com");
        Assert.False(guard.IsBlocked("ana@example.com"));
    }

    [Fact]
    public void Expired_entries_are_swept_even_if_never_queried_again()
    {
        var (guard, clock) = Create();
        for (var i = 0; i < 500; i++) guard.RecordFailure($"spray{i}@example.com");
        Assert.Equal(500, guard.TrackedAccounts);

        clock.Advance(TimeSpan.FromMinutes(16));
        guard.RecordFailure("nuevo@example.com");

        Assert.Equal(1, guard.TrackedAccounts);
    }

    [Fact]
    public void Memory_stays_bounded_under_a_sustained_spray()
    {
        var (guard, clock) = Create();
        for (var i = 0; i < LoginAttemptGuard.MaximumTrackedAccounts + 5_000; i++)
        {
            if (i % 100 == 0) clock.Advance(TimeSpan.FromMilliseconds(1));
            guard.RecordFailure($"spray{i}@example.com");
        }

        Assert.True(guard.TrackedAccounts <= LoginAttemptGuard.MaximumTrackedAccounts);
    }
}
