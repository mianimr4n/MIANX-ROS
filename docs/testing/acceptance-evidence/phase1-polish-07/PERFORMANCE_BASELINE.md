# Performance baseline

**Method:** Phase 1.1 Production public measurement (PERFORMANCE_NETWORK_AUDIT) + repository code contracts. Local build gzip re-measure deferred when live headed stack absent; budgets use documented Production baseline.

| Metric | Baseline | Source |
| --- | --- | --- |
| Public entry gzip | ~251.58 kB (257618 bytes) | Production @ `830dbc8` |
| Admin eager from public | false | App.tsx RC5-PERF-01 |
| Source maps (prod) | off (Vite default; not `sourcemap: true`) | vite.config.ts |
| experimentalMinChunkSize | 12_000 | vite.config.ts |

## Runtime (code contracts)

| Behavior | Mechanism |
| --- | --- |
| Stale response | `useOperationalData` AbortController + cancelled flag |
| Duplicate identical concurrent reads | `shareIdenticalRead` utility (opt-in coalescing) |
| KDS/Delivery polling | `pollMs` + visibility pause when document hidden |
| Logout private cache | `clearPrivateBrowserPersistence` |

Do not equate local and Production timings as identical without matching environments.
