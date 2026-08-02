# Accessibility / performance

## Accessibility

- Semantic regions + headings for What Changed and Operational timeline
- Severity/trust/tone expressed as text
- Keyboard-accessible filters and 44px controls
- Meaningful drill-down aria-labels
- No nested interactive controls; no disruptive live regions on refresh

## Performance

- Reuses DASH-01…07 / ops list payloads already loaded by AdminDashboard
- Pure composition + memoization; mode switch does not refetch history
- Timeline bounded to 20; no per-item requests; no new polling/realtime
- Public routes receive no admin imports
