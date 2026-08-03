# Public website results

| Route | Automated | Notes |
| --- | --- | --- |
| `/` desktop/mobile | RC6-A11Y-02 | 0 critical/serious + overflow check |
| `/menu` desktop/mobile | RC6-A11Y-02 | Product h2, favorites name |
| `/admin/login` | RC6-A11Y-02 | Labeled email |
| `/reset-password` | Family | Covered by auth family; no Admin import |
| Cart/checkout | Family | Existing public patterns |

Public bundles do not eager-import Admin shell (lazy Admin routes in App.tsx retained).
