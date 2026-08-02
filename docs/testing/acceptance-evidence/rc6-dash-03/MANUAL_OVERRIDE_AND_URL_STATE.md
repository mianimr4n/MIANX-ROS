# RC6-DASH-03 — Manual override and URL state

- Query: `?commandMode=pre-open|live|closing`
- Invalid values ignored (fall back to suggestion)
- Refresh preserves valid manual selection
- “Use suggested mode” clears `commandMode`
- Drill-down destinations do **not** receive `commandMode`
- Browser Back to dashboard restores prior search (including mode) via history
- No org-wide config write; no PII in URL
- Branch change re-evaluates suggestion; pinned URL mode remains until cleared
