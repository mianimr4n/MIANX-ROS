# RC6-DASH-03 — Security / a11y / performance

## Security

- Client mode filter is presentation only
- Finance still role-gated via existing Exception Center path
- No PII in mode URL or header
- Branch authz unchanged (AdminBranchContext + APIs)

## Accessibility

- Radiogroup mode selector; min 44px targets
- Selected / suggested announced in text (not color-only)
- Visible focus styles retained
- Exception Center remains early in the page

## Performance

- No refetch on mode change
- One optional `fetchBranchProfile` when branch selected (not per mode)
- No new polling infrastructure
- Public routes receive no new admin imports
