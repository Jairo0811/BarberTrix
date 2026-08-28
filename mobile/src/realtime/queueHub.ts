import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { env } from '@/config/env';

export function createQueueHub(accessTokenFactory: () => string | Promise<string>): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${env.apiBaseUrl}/hubs/queue`, { accessTokenFactory })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(LogLevel.Warning)
    .build();
}
