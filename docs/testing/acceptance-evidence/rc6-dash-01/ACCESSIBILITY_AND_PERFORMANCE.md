# RC6-DASH-01 — Accessibility and performance

## Accessibility

- Semantic `section` + `h2` “Needs Attention Now”
- Severity announced as text (Critical / Warning / Information), not color alone
- Drill-downs are `Link` controls with meaningful `aria-label` (not clickable divs)
- `min-h-11` touch targets; visible focus rings
- Empty / partial / total-failure use `role="status"` without noisy live regions
- Owner Playwright dashboard axe spot-check remains in suite (critical/serious)

## Performance

- Zero new endpoints; reuses existing dashboard polls
- Single `buildExceptionCenter` aggregation per render (memoized inputs)
- No per-card network requests
- No new realtime infrastructure
- Dashboard shell continues to render independently of exception source failures
