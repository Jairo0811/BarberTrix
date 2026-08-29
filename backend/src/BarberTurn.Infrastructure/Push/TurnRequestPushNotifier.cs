using BarberTurn.Application.Push;
using BarberTurn.Domain.Entities;
using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Push;

internal sealed class TurnRequestPushNotifier(ApplicationDbContext dbContext) : ITurnRequestPushNotifier
{
    public async Task QueueForStaffAsync(
        Guid barberShopId,
        Guid barberId,
        Guid turnRequestId,
        TurnRequestPushEvent pushEvent,
        CancellationToken cancellationToken = default)
    {
        var subscriptionIds = await (
            from subscription in dbContext.PushSubscriptions
            join user in dbContext.Users on subscription.UserId equals user.Id
            where subscription.BarberShopId == barberShopId
                && subscription.IsActive
                && user.IsActive
                && (user.Role != UserRole.Barber || user.BarberId == barberId)
            select subscription.Id).ToListAsync(cancellationToken);

        var (title, body) = StaffCopy(pushEvent);
        Queue(subscriptionIds, title, body, "/(app)/turn-requests");
    }

    public async Task QueueForCustomerAsync(
        Guid turnRequestId,
        TurnRequestPushEvent pushEvent,
        CancellationToken cancellationToken = default)
    {
        var target = await (
            from subscription in dbContext.PushSubscriptions
            join request in dbContext.TurnRequests on subscription.TurnRequestId equals request.Id
            join shop in dbContext.BarberShops on request.BarberShopId equals shop.Id
            where request.Id == turnRequestId && subscription.IsActive
            select new { subscription.Id, shop.Slug }).ToListAsync(cancellationToken);
        if (target.Count == 0)
            return;

        var (title, body) = CustomerCopy(pushEvent);
        Queue(
            target.Select(item => item.Id),
            title,
            body,
            $"/request-status/{target[0].Slug}/{turnRequestId}");
    }

    private void Queue(IEnumerable<Guid> subscriptionIds, string title, string body, string route)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var subscriptionId in subscriptionIds.Distinct())
            dbContext.PushNotificationOutbox.Add(new PushNotificationOutbox(subscriptionId, title, body, route, now));
    }

    private static (string Title, string Body) StaffCopy(TurnRequestPushEvent pushEvent) => pushEvent switch
    {
        TurnRequestPushEvent.Created => ("Nueva solicitud de turno", "Hay una nueva solicitud pendiente de revisión."),
        TurnRequestPushEvent.Cancelled => ("Solicitud cancelada", "Un cliente canceló una solicitud pendiente."),
        TurnRequestPushEvent.CounterAccepted => ("Contraoferta aceptada", "El cliente aceptó el horario propuesto."),
        _ => ("Solicitud actualizada", "Una solicitud de turno cambió de estado.")
    };

    private static (string Title, string Body) CustomerCopy(TurnRequestPushEvent pushEvent) => pushEvent switch
    {
        TurnRequestPushEvent.Accepted => ("Solicitud aceptada", "Tu turno fue confirmado. Abre BarberTurn para ver los detalles."),
        TurnRequestPushEvent.Rejected => ("Solicitud no disponible", "La barbería respondió a tu solicitud. Abre BarberTurn para verla."),
        TurnRequestPushEvent.CounterProposed => ("Nuevo horario propuesto", "La barbería propuso otro horario para tu solicitud."),
        _ => ("Solicitud actualizada", "Tu solicitud de turno cambió de estado.")
    };
}
