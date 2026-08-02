# RC6-DASH-05 — Security and privacy review

- Only authorized branches appear via existing AdminBranchContext / API authz.
- Client-side filtering is not treated as authorization.
- Finance cash component is permission-gated; restricted → omitted (not failure).
- No customer names, phones, addresses in score summaries or URLs.
- No employee identities, salaries, or rider locations.
- No supplier names in score text.
- No raw order identifiers in Owner summary cards.
- Drill-down destinations enforce their own authorization.
- No new mutation APIs; no migrations; no Production SQL.
