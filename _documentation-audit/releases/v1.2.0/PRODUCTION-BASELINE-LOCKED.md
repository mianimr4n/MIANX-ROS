# PRODUCTION BASELINE — v1.2.0 (KNOWN GOOD)

| Field | Value |
|---|---|
| Release | **v1.2.0** |
| Status | **LOCKED** |
| Frozen at | 2026-07-15 |
| Git tag | `v1.2.0` |
| Git commit | `697554a` |
| Rollback point | **YES** — use this baseline for R0/R1 recoveries |

---

## Locked surface

| Layer | Target | Freeze rule |
|---|---|---|
| Website | https://telepizza-website.vercel.app | No Sprint 3 menu/pricing/catalog UX changes |
| Backend API | https://telepizza-api.onrender.com | Catalog contract frozen (`toppings` + meta counts) |
| Supabase Database | `pyeowxvacgypohrbvgee` | No menu/business-rule schema churn in Sprint 3 |
| Menu Catalog | 13 / 58 / 3 / 40 / 7 | Counts + topping SKUs / prices locked |
| Business Rules | BFR-001 HYBRID · BFR-003 REPRICE · BFR-012 Option B | Do not reopen without new release |

---

## Catalog snapshot (locked)

| Metric | Value |
|---|---:|
| Public categories | 13 |
| Public items | 58 |
| Toppings (internal) | 3 |
| Variants | 40 |
| Deals | 7 |

Topping prices (locked): Extra Chicken / Extra Cheese = 50 / 100 / 150; Extra Cheese Slice = 60.  
Behari Kabab Pizza: Rs 549, Starting Price, **0** invented variants.

---

## Allowed after freeze

- Sprint 3: users, authentication, authorization, sessions, branch-scoped access, profiles
- Hotfix only with explicit owner approval + new patch release if customer catalog risks appear

## Not allowed without new release

- Menu / pricing / catalog / Option B business-rule edits
- Production topping SKU / Behari baseline edits
- Starting work that mutates frozen catalog contract without version bump

---

## Artifacts

See `_documentation-audit/releases/v1.2.0/` for release notes, checklists, API/DB/menu exports, and rollback checklist.
