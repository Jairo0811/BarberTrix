import { createQueueHub } from './queueHub';
export type QueueChangedPayload = { eventName?: string; occurredAtUtc?: string };
export function createTurnRequestRealtimeConnection(accessTokenFactory: () => string, onTurnRequestChanged: (payload: QueueChangedPayload) => void) {
  const connection = createQueueHub(accessTokenFactory);
  connection.on('queueChanged', (payload: QueueChangedPayload) => {
    if (payload?.eventName?.startsWith('turn-request-')) onTurnRequestChanged(payload);
  });
  return connection;
}
