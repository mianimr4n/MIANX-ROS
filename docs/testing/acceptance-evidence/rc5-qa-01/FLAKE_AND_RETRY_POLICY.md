# RC5-QA-01 — Flake and retry policy

| Setting | Value |
| --- | --- |
| Browser | Chromium only |
| Workers | 1 |
| `fullyParallel` | false |
| Local retries | 0 |
| CI retries | 1 |
| Test timeout | 120s |
| Expect timeout | 30s |
| Video | off |
| Screenshot | only-on-failure |
| Trace | retain-on-failure |
| Workflow job timeout | 45 minutes |

## Rationale

- Single worker + serial Owner tests reduce race flake on shared local auth.
- One CI retry absorbs rare Chromium/startup jitter without hiding systemic failures.
- Local self-test requires **zero** retries across three consecutive greens.

## Artifact policy

- Upload **only on failure**.
- Artifact name includes `github.run_id` / `run_attempt`.
- Retention: 7 days.
- Never upload handover JSON, `.env*`, or Supabase status env files.
- Failure traces/screenshots may still capture session cookies or password field values in a11y snapshots — treat artifacts as sensitive; do not publish publicly.
