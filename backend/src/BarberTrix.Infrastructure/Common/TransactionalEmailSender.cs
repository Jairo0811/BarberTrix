using BarberTrix.Application.Common;
using BarberTrix.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace BarberTrix.Infrastructure.Common;

internal interface ITransactionalEmailDispatcher
{
    Task FlushAsync(CancellationToken cancellationToken = default);
}

internal sealed class TransactionalEmailSender(
    ApplicationDbContext dbContext,
    ConfigurableEmailSender transport,
    ILogger<TransactionalEmailSender> logger) : IEmailSender, ITransactionalEmailDispatcher
{
    internal static readonly TimeSpan[] RetryDelays = [TimeSpan.FromMilliseconds(250), TimeSpan.FromSeconds(1)];

    private readonly Queue<PendingEmail> pending = new();

    public Task SendAsync(string recipient, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (dbContext.Database.CurrentTransaction is null)
            return transport.SendAsync(recipient, subject, htmlBody, cancellationToken);

        cancellationToken.ThrowIfCancellationRequested();
        pending.Enqueue(new PendingEmail(recipient, subject, htmlBody));
        return Task.CompletedTask;
    }

    public async Task FlushAsync(CancellationToken cancellationToken = default)
    {
        if (dbContext.Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Transactional email cannot be flushed before the database transaction commits.");

        // The database transaction has already committed, so an SMTP outage must not turn a
        // successful registration/invitation into a 500 or drop the rest of the queue.
        // Retry briefly, then log and move on; the user can request a new e-mail.
        while (pending.TryDequeue(out var email))
        {
            var delivered = await TrySendWithRetryAsync(
                ct => transport.SendAsync(email.Recipient, email.Subject, email.HtmlBody, ct),
                RetryDelays,
                (attempt, exception) => logger.LogWarning(exception,
                    "Transactional e-mail delivery attempt {Attempt} failed", attempt),
                cancellationToken);
            if (!delivered)
                logger.LogError("Transactional e-mail was not delivered after {Attempts} attempts", RetryDelays.Length + 1);
        }
    }

    internal static async Task<bool> TrySendWithRetryAsync(
        Func<CancellationToken, Task> send,
        IReadOnlyList<TimeSpan> delays,
        Action<int, Exception> onFailure,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await send(cancellationToken);
                return true;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                onFailure(attempt, exception);
                if (attempt > delays.Count)
                    return false;
                await Task.Delay(delays[attempt - 1], cancellationToken);
            }
        }
    }

    private sealed record PendingEmail(string Recipient, string Subject, string HtmlBody);
}
