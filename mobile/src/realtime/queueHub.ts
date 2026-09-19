import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { env } from '@/config/env';
import { expectedDisconnect } from './lifecycle';

export function createQueueHub(accessTokenFactory: () => string | Promise<string>): HubConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(`${env.apiBaseUrl}/hubs/queue`, { accessTokenFactory })
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: context => Math.min(30_000, 2_000 * (context.previousRetryCount + 1)) })
    .configureLogging({ log(level, message) {
      // RN maps console.error to a red LogBox. Expected transport loss is a state,
      // not an application crash. Never blanket-disable LogBox or unexpected errors.
      if (expectedDisconnect(message)) { if (__DEV__) console.info('[realtime] Transport interrupted; reconnecting.'); return; }
      if (level >= LogLevel.Error) console.error('[realtime]', message);
      else if (level >= LogLevel.Warning) console.warn('[realtime]', message);
    } })
    .build();
  connection.serverTimeoutInMilliseconds = 60_000;
  connection.keepAliveIntervalInMilliseconds = 15_000;
  return connection;
}
