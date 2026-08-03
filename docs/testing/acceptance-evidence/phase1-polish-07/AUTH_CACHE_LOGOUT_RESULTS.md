# Auth / cache / logout results

| Check | Result |
| --- | --- |
| `clearLocalAuth` | Clears in-memory session/roles |
| `clearStoredUser` | Legacy identity key |
| `clearPrivateBrowserPersistence` | Clears PII prefixes + inflight map |
| Pending reads | Aborted on unmount; inflight map cleared |
| Protected routes | Existing gates retained |
| QA-04 / Owner logout smoke | Retained via CI |

No session tokens written to evidence.
