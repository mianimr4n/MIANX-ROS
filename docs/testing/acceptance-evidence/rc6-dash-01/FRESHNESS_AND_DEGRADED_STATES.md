# RC6-DASH-01 — Freshness and degraded states

| State | UI behavior |
| --- | --- |
| Loading (no cards yet) | “Loading supported exceptions…” |
| All sources OK, zero matches | Honest empty: no supported exceptions detected; not full-risk coverage |
| Partial source failure | Amber partial-data warning + available cards + retry |
| All required sources failed | Red unavailable banner — **not** all-clear / not zero |
| STALE source | Card freshness `STALE` when op-status is STALE |
| LIVE / FRESH | Shown on cards from successful sources |
| Finance permission absent | Finance source excluded (not failure) |

Never convert API failure into count 0. Never show all-clear when a required source failed.
