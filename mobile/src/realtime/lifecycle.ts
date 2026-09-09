export type RealtimeState = 'Connecting' | 'Connected' | 'Reconnecting' | 'Offline';
export interface RealtimeConnection {
  readonly state: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onreconnecting(callback: (error?: Error) => void): void;
  onreconnected(callback: () => void): void;
  onclose(callback: (error?: Error) => void): void;
}
export function expectedDisconnect(message: string): boolean {
  return /Server timeout elapsed without receiving a message from the server|Network request failed|Failed to fetch|The connection was stopped during negotiation/i.test(message);
}
// Independent of React Native, so lifecycle races are testable without a simulator.
export function manageRealtime(connection: RealtimeConnection, setState: (state: RealtimeState) => void, resync: () => void, report: (error: unknown) => void) {
  let active = false;
  let disposed = false;
  let operation: Promise<void> = Promise.resolve();
  let retry: ReturnType<typeof setTimeout> | undefined;
  const clearRetry = () => { if (retry) clearTimeout(retry); retry = undefined; };
  const diagnose = (error: unknown) => {
    if (error && !expectedDisconnect(error instanceof Error ? error.message : String(error))) report(error);
  };
  const schedule = () => {
    clearRetry();
    if (active && !disposed) retry = setTimeout(() => { void reconcile(); }, 10_000);
  };
  const connected = () => {
    if (!active || disposed) return;
    clearRetry(); setState('Connected'); resync();
  };
  function reconcile(): Promise<void> {
    operation = operation.then(async () => {
      if (!active || disposed) { await connection.stop(); return; }
      if (connection.state === 'Connected') { connected(); return; }
      if (connection.state !== 'Disconnected') return;
      setState('Connecting');
      try { await connection.start(); connected(); }
      catch (error) { if (active && !disposed) { setState('Offline'); diagnose(error); schedule(); } }
    }).catch(error => { diagnose(error); schedule(); });
    return operation;
  }
  connection.onreconnecting(error => { if (active && !disposed) { setState('Reconnecting'); diagnose(error); } });
  connection.onreconnected(connected);
  connection.onclose(error => { if (active && !disposed) { setState('Offline'); diagnose(error); schedule(); } });
  return {
    setActive(value: boolean) {
      active = value; clearRetry();
      if (!value) setState('Offline');
      return reconcile();
    },
    dispose() { disposed = true; active = false; clearRetry(); return reconcile(); },
  };
}
