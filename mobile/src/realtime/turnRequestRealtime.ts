import * as signalR from '@microsoft/signalr';
import { env } from '@/config/env';

export type QueueChangedPayload = {
  eventName?: string;
  occurredAtUtc?: string;
};

export type RealtimeState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export function createTurnRequestRealtimeConnection(
  accessTokenFactory: () => string,
  onTurnRequestChanged: (payload: QueueChangedPayload) => void,
  onStateChanged?: (state: RealtimeState) => void,
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${env.apiBaseUrl}/hubs/queue`, { accessTokenFactory })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(signalR.LogLevel.None)
    .build();

  // React Native devices can briefly suspend networking or delay WebSocket
  // traffic while the app changes state. Keep the connection tolerant enough
  // to recover without surfacing a red LogBox for a transient timeout.
  connection.serverTimeoutInMilliseconds = 90_000;
  connection.keepAliveIntervalInMilliseconds = 15_000;

  connection.on('queueChanged', (payload: QueueChangedPayload) => {
    if (payload?.eventName?.startsWith('turn-request-')) onTurnRequestChanged(payload);
  });

  connection.onreconnecting(() => onStateChanged?.('reconnecting'));
  connection.onreconnected(() => onStateChanged?.('connected'));
  connection.onclose(() => onStateChanged?.('offline'));

  const start = connection.start.bind(connection);
  connection.start = async () => {
    onStateChanged?.('connecting');
    try {
      await start();
      onStateChanged?.('connected');
    } catch (error) {
      onStateChanged?.('offline');
      throw error;
    }
  };

  return connection;
}
