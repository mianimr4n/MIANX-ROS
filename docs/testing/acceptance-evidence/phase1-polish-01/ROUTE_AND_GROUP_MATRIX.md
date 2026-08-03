# POLISH-01 — Route and group matrix

Groups and primary hrefs (authorization still role-filtered at runtime):

| Group | Keys |
| --- | --- |
| Overview | kitchen-home, branch-home, dashboard |
| Operations | orders, kitchen, delivery, pos, floor-console, reservations, waitlist, whatsapp |
| Commerce | menu, inventory, purchasing, promotions |
| Customers | customers, loyalty |
| Management | floor-plan, staff, finance, reports |
| Intelligence | ai-team |
| System | settings |

Empty groups omit from sidebar (`groupAdminNavItems` filters length > 0).
