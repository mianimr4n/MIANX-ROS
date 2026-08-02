# RC6-DASH-05 — Accessibility and performance

## Accessibility

- Score not by color alone — numeric score + textual status label.
- Coverage and confidence as readable text.
- Component scores have aria-labels; breakdown uses expand/collapse with `aria-expanded`.
- Drill-down links have meaningful names.
- `min-h-11` touch targets; `min-w-0` for mobile overflow.
- No disruptive live regions.

## Performance

- Reuses already-fetched Owner dashboard sources (ops, kitchen, delivery, finance).
- No new polling; no per-component network fan-out.
- Pure memoized `buildBranchHealthScore` + mode emphasis reorder.
- Mode switch does not refetch score sources.
- No new analytics engine.
