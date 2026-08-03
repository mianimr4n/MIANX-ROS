# Stale-response results

| Scenario | Protection |
| --- | --- |
| Branch / filter / deps change | Abort + `cancelled` guard in `useOperationalData` |
| Unmount | Abort + clear poller |
| Auth `/auth/me` race | `profileRequestId` generation |
| Abandoned errors | Ignored when cancelled/aborted |

Budget: zero visible stale branch commits under new label.
