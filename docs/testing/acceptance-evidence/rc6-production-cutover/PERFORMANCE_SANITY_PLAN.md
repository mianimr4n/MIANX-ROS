# Performance sanity plan (DRAFT — post-deploy)

Checks (no unsupported absolute SLA):

- Main website entry/chunk loads without error
- Owner dashboard lazy chunks load
- Public routes do not eagerly import Command Center modules
- Dashboard request count / duplicates (spot)
- Mode-switch does not refetch all sources (client composition)
- Branch-switch supersedes stale requests
- No chunk-load errors
- EOD export controls remain local/on-demand
- Shell usable while secondary sources load

Baseline: `docs/testing/acceptance-evidence/rc6-command-center-integration/PERFORMANCE_NETWORK_RESULTS.md`
