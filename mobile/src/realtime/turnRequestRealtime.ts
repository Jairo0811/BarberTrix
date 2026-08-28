import * as signalR from '@microsoft/signalr';
import { env } from '@/config/env';

export type QueueChangedPayload = {
  eventName?: string;
  occurredAtUtc?: string;
};

export function createTurnRequestRealtimeConnection(
  accessTokenFactory: () => string,
  onTurnRequestChanged: (payload: QueueChangedPayload) => void,
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${env.apiBaseUrl}/hubs/queue`, { accessTokenFactory })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('queueChanged', (payload: QueueChangedPayload) => {
    if (payload?.eventName?.startsWith('turn-request-')) onTurnRequestChanged(payload);
  });

  return connection;
}
