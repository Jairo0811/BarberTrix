# Realtime reliability

The API remains the source of truth. SignalR events invalidate snapshots; they are not a second database or an authorization mechanism.

## Mobile lifecycle

`useQueueRealtime` owns the focused screen's connection to `/hubs/queue`. It delegates transport construction to `queueHub` and lifecycle transitions to the platform-independent `manageRealtime` helper.

| State | Meaning | UI |
| --- | --- | --- |
| Connecting | Initial/foreground start is pending | Connecting… |
| Connected | Hub start/reconnection succeeded | Live |
| Reconnecting | SignalR is retrying a lost transport | Reconnecting… |
| Offline | Closed, failed start, or app suspended | Offline |

The badge never infers connectivity from cached data or a successful HTTP poll. A network loss is observable after the transport detects it (up to the configured timeout); this is not an instantaneous network reachability sensor.

- Client keep-alive: 15 seconds; server timeout: 60 seconds.
- API keep-alive: 15 seconds; client timeout: 60 seconds.
- Automatic reconnect retries grow from 2 seconds to a 30-second ceiling, without a finite retry limit.
- Initial-start/closed retries run every 10 seconds while active.
- Background/blur stops the connection and marks it offline; foreground/focus starts it again. Start/stop operations are serialized, including a pending initial start.
- Successful start/reconnect invalidates/refetches the API snapshot.
- Staff requests retain 60-second polling; Today uses 30 seconds. React Native AppState also drives TanStack Query focus, so stale queries refresh on foreground.
- Expected server timeouts/transport failures are recognized narrowly. The logger uses a development informational message for these events. It does not disable LogBox globally; unexpected protocol/application errors remain diagnostic errors.

The timeout doubles the normal 30-second default to tolerate mobile jitter without keeping a false live state indefinitely. Background suspension is handled by lifecycle, not by extending timeouts for minutes.

## Verification

`cd mobile && npm test` covers transitions, background/foreground recovery, disposal, resync, and expected versus unexpected errors. Physical network-switch and suspension testing remains required; a mock connection cannot validate an iOS radio or OS scheduling behavior.

## TV endurance drill

Use a preview/staging display session for 8–12 hours. Record browser/OS, build SHA, start/end UTC, memory samples and refresh/reconnect counts. Exercise Wi-Fi interruption, API restart, return from a hidden tab, audio unlock by user gesture, token revocation, and a fresh snapshot after recovery. Confirm no customer phone/email appears. Record failures and evidence; this procedure alone is not a passed endurance test.

For kiosk deployment, use the browser/OS kiosk configuration and disable operating-system sleep where permitted. Fullscreen and audio need a user gesture; browser wake lock is best effort and never substitutes for device power configuration.

References: [SignalR configuration](https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration?view=aspnetcore-10.0), [JavaScript reconnect behavior](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0).
