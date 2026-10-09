using BarberTrix.Application.Common;
using BarberTrix.Infrastructure.Persistence;

namespace BarberTrix.Infrastructure.Common;

internal interface ITransactionalEmailDispatcher
{
    Task FlushAsync(CancellationToken cancellationToken = default);
}

internal sealed class TransactionalEmailSender(
    ApplicationDbContext dbContext,
    ConfigurableEmailSender transport) : IEmailSender, ITransactionalEmailDispatcher
{
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

        while (pending.TryDequeue(out var email))
            await transport.SendAsync(email.Recipient, email.Subject, email.HtmlBody, cancellationToken);
    }

    private sealed record PendingEmail(string Recipient, string Subject, string HtmlBody);
}
