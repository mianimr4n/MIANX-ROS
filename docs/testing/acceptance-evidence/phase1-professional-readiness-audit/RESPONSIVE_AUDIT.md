# Phase 1.1 — Responsive audit

**Viewports:** 360×800, 390×844, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080  
**Method:** Production public smoke (mobile+desktop) + repository responsive classes review; authenticated Admin responsive certification deferred to POLISH-06 (local headed matrices).

## Public

| Viewport class | Routes | Result |
| --- | --- | --- |
| Mobile ~390 | `/` `/menu` | Smoke PASS; no blank |
| Desktop | `/` `/menu` `/admin/login` | Smoke PASS |

## Admin (code + prior Owner smoke)

| Area | Risk | Severity |
| --- | --- | --- |
| Sidebar long list | Scroll/discoverability on 360–768 | P2 |
| Topbar search+branch+user | Collision/wrapping | P2 |
| Orders/Delivery tables | Horizontal overflow | P2 |
| Owner dashboard cards | Stack ok; long page | P2 |
| Settings category nav | Narrow usable | P2 |
| Inventory tables | Overflow | P2 |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-RESP-01 | P2 | Admin tables need systematic overflow strategy |
| P11-RESP-02 | P2 | Shell topbar density on 768 |
| P11-RESP-03 | P3 | Branch label truncate hides context |

Full matrix certification = POLISH-06 acceptance gate.
