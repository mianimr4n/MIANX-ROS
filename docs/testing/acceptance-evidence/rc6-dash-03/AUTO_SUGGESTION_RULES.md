# RC6-DASH-03 — Automatic suggestion rules

Timezone: branch profile timezone when available, else `Asia/Karachi`.

Clock: caller-supplied `now` (UI uses wall clock; tests use deterministic UTC instants).

With valid `opensAt` / `closesAt`:

1. Outside window + unresolved ops → **CLOSING** (MEDIUM)
2. Outside window + quiet → **PRE_OPEN** (MEDIUM)
3. Inside window and ≤60 minutes to close → **CLOSING** (HIGH)
4. Otherwise inside window → **LIVE_OPERATIONS** (HIGH)

Overnight windows (`opensAt` > `closesAt`) supported.

Missing/invalid/identical hours → **LIVE_OPERATIONS** (LOW) + limitation; manual selector remains.

Advisory only — never claims the branch is actually open or closed from time alone.
