# Build chunk audit

| Item | Result |
| --- | --- |
| Eager entry | Home, Menu, AdminLogin only |
| Admin pages | `React.lazy` per route |
| Module navigator | Metadata only — no page imports |
| Min chunk merge | 12_000 bytes |
| Prod source maps | Not enabled |
| Axe/Playwright | Root devDependency — e2e only |

Chunk decision: keep route-level lazy loading; avoid micro-chunk explosion via experimentalMinChunkSize.
