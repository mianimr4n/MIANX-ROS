# Client storage inventory

| Key / prefix | PII | Logout |
| --- | --- | --- |
| `theme` | No | Keep |
| `telepizza.selectedBranchId` | No | Keep |
| `telepizza.admin.branchScope` | No | Keep |
| `telepizza.admin.nav.groups.v1` | No | Keep |
| `telepizza.admin.whatChanged.v1` | Aggregate only | Keep |
| `telepizza.auth.user` | Yes (legacy) | Clear |
| `telepizza.orders` | Yes | Clear |
| `telepizza.loyalty.points` | Soft | Clear |
| `telepizza.notifications.*` | Yes | Clear |
| `telepizza.customer.addresses.*` | Yes | Clear |
| `telepizza.customer.notification-prefs.*` | Soft | Clear |
| `telepizza.auth.next` / `.flow` | Path only | Clear (session) |

Cart remains in-memory (not LS).
