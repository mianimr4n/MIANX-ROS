# Isolation Results

| Suite | Result |
| --- | --- |
| `pnpm rc1:gate` auth/branch matrix | PASS |
| KDS authorization | PASS |
| Supplier portal tests (Vitest suite) | PASS within `pnpm test` |
| Branch isolation | Covered by rc1 matrix |

Production isolation cannot be certified while schema columns required by HR/Finance APIs are missing remotely.
