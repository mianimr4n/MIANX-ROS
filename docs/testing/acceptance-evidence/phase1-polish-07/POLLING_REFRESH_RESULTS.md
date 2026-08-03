# Polling / refresh results

| Workspace | Interval | Hidden document |
| --- | --- | --- |
| KDS tickets | 8s | Poller paused (visibilitychange) |
| Delivery assignments | 8s | Paused |
| Owner secondary hooks | 30–120s | Paused when using `pollMs` |
| Orders | Manual / deps only | N/A |

One active interval per `useOperationalData` instance; cleared on unmount.
