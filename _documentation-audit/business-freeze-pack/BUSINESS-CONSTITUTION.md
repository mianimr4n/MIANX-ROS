# Business Constitution

**Governance:** Mianx.ai  
**Status:** `DRAFT` — immutable fields marked 🔒 after owner sign-off  
**Rule:** This document changes only via **Decision Register amendment** + owner approval.  
**Purpose:** Permanent foundation for ERP, POS, Kitchen, Rider, Admin, and AI agents.

---

## 1. Identity 🔒 (post sign-off)

| Field | Value | Status |
|---|---|---|
| Official brand name | **Telepizza** | Evidence ✓ |
| Legal entity name | _TBD owner_ | OPEN |
| Business type | Restaurant (QSR / dine-in + delivery) | WORKING |
| Country | Pakistan | ✓ |
| Primary city (V1) | Multan | ✓ |
| Currency | **PKR** (Pakistani Rupee) | 🔒 |
| Timezone | **Asia/Karachi** | 🔒 |
| Language (customer) | English + Urdu | WORKING |

---

## 2. Brand assets

| Field | Canonical value | Status |
|---|---|---|
| Official logo | `public/images/telepizza-logo.png` | DRAFT |
| Logo fallback | SVG in `image-fallback.ts` | ✓ |
| Primary color | `#E31E24` (brand red) | DRAFT |
| Secondary accent | `#F5B800` (gold) | DRAFT |
| Background | `#FFF7F3` (cream) | DRAFT |
| Text / dark | `#1F1F1F` (charcoal) | DRAFT |
| Display font | Poppins | DRAFT |
| Body font | DM Sans | DRAFT |
| Printed tagline | "Love At First Bite" | GM evidence |
| Website tagline | _Owner TBD_ | BFR-009 |

---

## 3. Contact & branches

| Field | V1 value | Owner confirm |
|---|---|---|
| Official phone / order / WhatsApp | **0304-1110495** | 🔒 LOCKED 2026-07-14 |
| WhatsApp international format | **923041110495** | 🔒 |
| Alternate phone (promo creatives) | 0304-1111795 | **DO NOT PUBLISH** — EC-001 conflict |
| Official email | _TBD_ | OPEN |
| **Operating branch (V1)** | Royal Orchard Main Business Plaza, Musa Wala, Multan 60000 | 🔒 Active |
| Branch code | `royal-orchard` | 🔒 |
| **Northern Bypass** | Northern Bypass Road, Multan — **Coming Soon** (no orders V1) | 🔒 |
| Opening hours | **10:00 AM – 2:30 AM** daily | 🔒 APPROVED 2026-07-14 |

---

## 4. Commerce rules (V1 placeholders — ERP phase)

| Field | V1 rule | Status |
|---|---|---|
| Tax model | _TBD — GST/sales tax if applicable_ | OPEN |
| Tax inclusive pricing | Menu prices include tax: _TBD_ | OPEN |
| Payment methods (future) | COD, JazzCash, EasyPaisa (BD-006 assumption) | DEFERRED |
| Delivery model | _TBD_ (BD-005) | DEFERRED |
| Free delivery threshold | _TBD_ (BD-012) | DEFERRED |
| Order cancellation | _TBD_ (BD-008) | DEFERRED |
| Refund policy | _TBD_ (BD-007) | DEFERRED |

---

## 5. Menu constitution

| Rule | Value |
|---|---|
| **V1 initial seed** | **Structured menu-board images** (BFR-001 pending owner approve) |
| **GM Jul 2026 (`REAL-MENU-EXTRACTION.md`)** | Secondary evidence — conflicts logged; no silent override |
| **Ongoing menu & prices** | **Owner Dashboard** (Admin Panel) after launch |
| **V1 public food SKUs** | 88 (excl. 43 telebar `PLANNED_V2`) at launch seed |
| Telebar | V2 module — not customer website V1 |
| Pizza sizes (GM seed) | 6" Small · 10" Medium · 12" Large |
| Extra toppings | Customizer only (recommended BFR-012) |
| Slug convention | `kebab-case`, stable; dashboard edits keep slug unless CR says retire |
| Temporary promos | Never permanent without owner action in dashboard or CR |

### Menu & price authority (important)

```text
V1 launch     →  Approved baseline seed (one-time) → Database + Website
After launch  →  Owner Dashboard  →  Master Data  →  All systems
```

- Menu **will** change. Prices **will** change. That is expected.
- Owner does **not** need to pre-approve every future price in documentation.
- Every dashboard change must write an **audit log** (who, when, old → new).
- Until dashboard is live: changes go through **Change Request** process.
- Engineering builds dashboard so owner is self-sufficient — docs are not the daily price tool.

---

## 6. Order & kitchen workflow (future — structure only)

```text
Customer order (WhatsApp V1 → API V2+)
        ↓
    CONFIRMED
        ↓
    KITCHEN_TICKET
        ↓
    PREPARING → READY
        ↓
    OUT_FOR_DELIVERY (if delivery)
        ↓
    COMPLETED
```

| Status | Meaning | V1 |
|---|---|---|
| WhatsApp handoff | Customer sends WA message | ✓ Current |
| CONFIRMED | Staff accepts order | Manual V1 |
| API order states | Full state machine | Phase 2+ |

---

## 7. Naming conventions 🔒

| Entity | Pattern | Example |
|---|---|---|
| Product slug | `kebab-case` | `tele-special` |
| Category slug | `kebab-case` | `signature-pizzas` |
| Variant label | Human readable + size | `10 inch Medium` |
| Branch code | `kebab-case` | `royal-orchard` |
| Decision ID | `BFR-###` | `BFR-001` |
| Catalog version | `v1.0.x` | `v1.0.0` |

---

## 8. Single source of truth hierarchy

```text
1. BUSINESS-CONSTITUTION.md     (immutable rules)
2. MASTER-DATA-FREEZE.md        (catalog entities)
3. BUSINESS-DECISION-REGISTER   (amendments)
4. Supabase production          (runtime mirror)
5. Website static fallback      (disaster recovery)
```

**Law:** Runtime systems never contradict levels 1–3.  
**Changes:** [CHANGE-REQUEST-PROCESS.md](./CHANGE-REQUEST-PROCESS.md) only.  
**Version:** [BUSINESS-FREEZE-VERSIONS.md](./BUSINESS-FREEZE-VERSIONS.md)

---

## 9. Constitution lock

| Field | Value |
|---|---|
| Constitution status | `DRAFT` |
| Locked with | `IMPLEMENTATION-LOCK.md` @ V1.0 |
| Locked date | _pending owner_ |
| Amendment authority | Business owner only |

---

*Amendments require Decision Register entry — never silent edits.*
