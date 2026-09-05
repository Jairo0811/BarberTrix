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
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(signalR.LogLevel.None)
    .build();

  // Mobile networks and iOS app-state transitions can briefly delay
  // WebSocket traffic. Keep a wider timeout than the default so transient
  // pauses recover through automatic reconnect instead of surfacing LogBox.
  connection.serverTimeoutInMilliseconds = 90_000;
  connection.keepAliveIntervalInMilliseconds = 15_000;

  connection.on('queueChanged', (payload: QueueChangedPayload) => {
    if (payload?.eventName?.startsWith('turn-request-')) onTurnRequestChanged(payload);
  });

  return connection;
}
