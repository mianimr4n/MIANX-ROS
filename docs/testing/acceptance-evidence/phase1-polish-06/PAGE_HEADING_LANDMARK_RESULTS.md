# Page heading and landmark results

| Rule | Result |
| --- | --- |
| Shell page `h1` | One (`resolvedTitle`) inside authenticated shell |
| Module decorative titles | `data-admin-page-title` paragraphs — not `h1` |
| Operations titles | Non-heading (POLISH-03) + `data-admin-page-title` |
| KDS specialized shell | Own `h1` (KitchenManagerShell) — intentional exclusion from AdminShell |
| Duplicate h1 on Inventory/HR/Finance/Settings/Menu/Reports/CRM/Loyalty/Marketing | Removed |
| `main` landmark | One per AdminShell |
| Nav landmarks | Admin modules + unique labels retained |
