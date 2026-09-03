using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BarberTrix.Infrastructure.Push;

internal sealed partial class PushDeliveryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PushDeliveryWorker> logger) : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider.GetRequiredService<PushDeliveryProcessor>();
                var processed = await processor.ProcessBatchAsync(stoppingToken);
                if (processed > 0)
                    continue;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                LogUnexpectedWorkerError(logger, exception);
            }

            await Task.Delay(IdleDelay, stoppingToken);
        }
    }

    [LoggerMessage(
        EventId = 3011,
        Level = LogLevel.Error,
        Message = "Unexpected error in the push delivery worker.")]
    private static partial void LogUnexpectedWorkerError(ILogger logger, Exception exception);
}
