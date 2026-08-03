# POLISH-01 — Branch context decision

## Global shell

- Label: **Active** + branch name
- `aria-label`: `Active operational branch: …`
- Listbox: `Active operational branch`
- Mechanism: existing `AdminBranchContext` (unchanged persistence key)

## Settings configuration

- Local selectors labeled **Editing settings for**
- Helper copy: configuration edit target does **not** change Active operational branch
- Selecting edit target does **not** call `setSelection` on global context
- Saves continue to use displayed `selectedId` only

## Filter-bar duplicates (Orders/Delivery/etc.)

Deferred to later polish — documented residual; same context sync already applies.
