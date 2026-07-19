# Phase 1 — Customer Platform Completion Program

**Product:** Telepizza Pakistan · Powered by Mianx.ai
**Date:** 2026-07-19
**Type:** Implementation roadmap & architecture — **planning only** (no application code, no PRs)
**Prerequisite audit:** `PHASE-1-CUSTOMER-PLATFORM-COMPLETION-AUDIT.md`
**Gate:** Phase 1 ✅ 100% Production Ready **before** Phase 2 Admin ERP

---

## Mission rules

- No shortcuts — every remaining module completes the full lifecycle:
  `Plan → Implement → Tests → PR Review → Merge → Migrate/Deploy → Smoke → Close`
- No fake loyalty, fake payment success, or fake GPS/ETA
- Catalog freeze v1.2.0 remains owner-gated
- WhatsApp ordering/support number **`0304-1110495`** never used as OTP sender (D11)
- Agents do not auto-merge or auto-deploy

## Baseline (from audit — post CP-1–6 implementation on `polish/my-telepizza-ux`)

| State | Modules |
|---|---|
| **Complete (implemented)** | Home, Menu, Cart, Checkout, Order Tracking, Addresses, Favorites, Reviews, Settings |
| **Partial** | Search, My Telepizza, Notifications |
| **Missing product modules** | None — remaining gaps are CP-3 SMTP (Owner-blocked), CP-7 UAT, hub polish |

**Lifecycle honesty:** Implemented ≠ deployed ≠ operational. Migrations are **committed** on the integration branch; apply in each target env is separate.

---

# 1. Phase 1 backlog

| ID | Work package | Item | Type | Priority | Depends on |
|---|---|---|---|---|---|
| P1-WP1-A | WP1 Customer Data | Cloud Addresses (DB + API + UI + migrate drafts) | Feature | P1 | Owner schema approval |
| P1-WP1-B | WP1 Customer Data | Authenticated Order History API + hub/Orders wiring | Feature | P1 | Existing `orders.auth_user_id` |
| P1-WP1-C | WP1 Customer Data | Reorder from server history (reuse review dialog) | Feature | P1 | P1-WP1-B |
| P1-WP2-A | WP2 Notifications | Channel architecture freeze (email first) | Architecture | P1 | SMTP owner checklist |
| P1-WP2-B | WP2 Notifications | Preference store + Settings/hub wiring | Feature | P1 | P1-WP2-A |
| P1-WP2-C | WP2 Notifications | Order lifecycle notification jobs | Feature | P1 | P1-WP2-B, order status events |
| P1-WP2-D | WP2 Notifications | Delivery status + audit + retry | Feature | P1 | P1-WP2-C |
| P1-WP3-A | WP3 Settings | `/settings` (or hub Settings IA) — profile/password/prefs/privacy/account | Feature | P1 | P1-WP2-B (prefs) |
| P1-WP4-A | WP4 Search | A11y + empty states + tests harden | Hardening | P1 | None |
| P1-WP4-B | WP4 Search | Optional category+name combo UX polish | Enhancement | P2 | P1-WP4-A |
| P1-WP5-A | WP5 Favorites | Favorites full stack (DB + API + UI) | Feature | P1* | Auth |
| P1-WP6-A | WP6 Reviews | Reviews full stack (DB + API + UI + moderation) | Feature | P1* | Order history, Auth |
| P1-GATE | Program | Phase 1 Production Ready close report | Gate | — | All P1* items |

\*Per “no shortcuts” program: Favorites and Reviews are **in scope** for Phase 1 Ready (not deferred).

**Out of Phase 1 Completion Program (explicit):** JazzCash/EasyPaisa, phone OTP (Slice 2C), loyalty ledger, live rider map, Admin ERP, Northern Bypass activation.

---

# 2. Dependency graph

```text
Owner approvals
  │  · Addresses schema (existing proposal)
  │  · SMTP / email channel ready (or WA utility template decision)
  │
  ▼
┌──────────────────┐     ┌─────────────────────┐
│ WP4 Search       │     │ WP1-A Addresses     │
│ (parallel early) │     │ cloud SoT           │
└──────────────────┘     └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ WP1-B Order History │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ WP1-C Reorder SoT   │
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐        ┌─────────────────┐
│ WP2 Notifications│      │ WP5 Favorites   │        │ WP6 Reviews     │
│ arch → prefs →   │      │ (can parallel   │        │ needs completed │
│ events → retry   │      │  after Auth)    │        │  order on SoT)  │
└────────┬────────┘      └─────────────────┘        └─────────────────┘
         │
         ▼
┌─────────────────┐
│ WP3 Settings    │  ← consumes profile + password + notification prefs + privacy
└────────┬────────┘
         ▼
┌─────────────────┐
│ Phase 1 GATE    │  Production Ready ✅ → unlock Phase 2 ERP
└─────────────────┘
```

**Hard edges**

- Addresses Owner approval before migration apply
- Order History before Reviews (review must attach to a real completed order)
- Notification channel decision before prefs that claim to control channels
- Settings after prefs model exists (or Settings ships prefs stub that becomes live in same sprint)
- Search harden is independent and should start first (cheap risk reduction)

---

# 3. Recommended implementation order

| Sprint | Focus | Exit |
|---|---|---|
| **CP-0** | Program freeze: this roadmap + Owner sign-offs (Addresses, email/WA channel) | APPROVED |
| **CP-1** | WP4 Search harden (parallel) + WP1-A Addresses | Addresses Production Ready |
| **CP-2** | WP1-B/C Order History + reorder from server | Hub/Orders SoT |
| **CP-3** | WP2 Notifications (arch → prefs → order events → retry/audit) | ≥1 live channel |
| **CP-4** | WP3 Settings page (profile/password/prefs/privacy/account) | Settings Ready |
| **CP-5** | WP5 Favorites | Favorites Ready |
| **CP-6** | WP6 Reviews | Reviews Ready |
| **CP-7** | Cross-module UAT + a11y + Phase 1 close | **Phase 1 PASS AND CLOSED** |

---

# Work Package 1 — Customer Data

## WP1-A — Addresses

### Requirements

| Item | Detail |
|---|---|
| **Users** | Authenticated customers |
| **Goals** | Cross-device delivery addresses as account SoT; checkout + My Telepizza share same list |
| **Must** | CRUD; one default per user; labels Home/Office/Other; Multan-first city default; explicit import of device drafts |
| **Must not** | GPS secrets in client; anon write; silent overwrite of cloud from local without confirm |
| **Acceptance** | New device after login shows cloud addresses; checkout default preselects `is_default`; localStorage no longer claimed as SoT |

Aligns with and **extends** `MY-TELEPIZZA-ADDRESSES-MIGRATION-PROPOSAL.md` (Owner REVIEW REQUIRED until approved).

### UX flow

```text
My Telepizza → Addresses
  → List cloud addresses (empty state: “Add your first address”)
  → Add / Edit dialog (label, line1, area, city, notes, default toggle)
  → Delete with confirm
  → Banner if device drafts exist: “Import from this browser?” → multi-select → merge
Checkout (signed-in)
  → Load GET /me/addresses
  → Select card or “Deliver to a different address” (one-off, optional save)
Guest checkout
  → Freeform address only (unchanged)
```

### Database model

```text
customer_addresses
  id uuid PK
  user_id uuid NOT NULL → auth.users (or public.users via auth_user_id policy — pick one consistent with Slice 2D helpers)
  label text CHECK IN ('Home','Office','Other')
  line1 text NOT NULL
  area text NOT NULL DEFAULT ''
  city text NOT NULL DEFAULT 'Multan'
  notes text NOT NULL DEFAULT ''
  is_default boolean NOT NULL DEFAULT false
  created_at, updated_at timestamptz

UNIQUE partial: one default per user_id WHERE is_default
RLS: authenticated SELECT/INSERT/UPDATE/DELETE own rows only
Grants: match post-R0 locked model (no anon DML)
```

**Audit:** optional `admin_audit` not required for customer self-service; support access later via admin Customers module (ERP), not Phase 1.

### Backend APIs

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/me/addresses` | Bearer | List own, default first |
| `POST` | `/api/v1/me/addresses` | Bearer | Create; if `is_default`, unset others |
| `PATCH` | `/api/v1/me/addresses/:id` | Bearer | Own only |
| `DELETE` | `/api/v1/me/addresses/:id` | Bearer | Own only; if deleted default, promote latest |
| `POST` | `/api/v1/me/addresses/import` | Bearer | Body: draft payloads; idempotent by normalized line1+label |

Validation: non-empty `line1`; max lengths; city allowlist or free text with trim.

### Frontend screens

- My Telepizza `#addresses` — switch from localStorage SoT to API
- Checkout address picker — API-backed
- Import drafts dialog
- Keep **read-only** local cache as offline convenience **optional**; never write-through without API success

### RBAC

| Principal | Access |
|---|---|
| Customer (own) | Full CRUD via `/me/addresses` |
| Staff / anon | **Denied** on `/me/*` |
| Service role | Migrations / support tooling only |

No new permission codes required if routes use “authenticated customer owns row” pattern (same as profile PATCH).

### Migration strategy

1. Owner approves proposal
2. Forward-only migration + RLS + grants
3. Deploy API
4. UI feature flag `ADDRESSES_CLOUD_SYNC_AVAILABLE = true`
5. Import banner for existing drafts
6. After 14 days (or Owner decision), stop writing new drafts as primary; local = cache only
7. Close report

### Testing

- Unit: default uniqueness, validation
- API: CRUD, isolation (user A cannot read B), import idempotency
- Static website: hub no longer claims “no table” when flag on
- UAT: two browsers, same login

### Documentation

- Update addresses proposal → **APPROVED / APPLIED** close note
- Customer help: “Manage delivery addresses”
- API notes in OpenAPI/module README

### Definition of Done — Addresses

- [ ] Owner-approved migration applied
- [ ] APIs + RLS isolation tests green
- [ ] Hub + checkout use cloud SoT
- [ ] Import path tested
- [ ] Docs + smoke on production/staging
- [ ] **Production Ready ✅**

---

## WP1-B/C — Order History

### Server model

| Concern | Design |
|---|---|
| **Source** | `orders` where `auth_user_id = current user` (already attached on authenticated create) |
| **Guest orders** | Remain phone-gated track/cancel; **optional later** claim-by-phone (out of MVP unless Owner demands) |
| **Projection** | id, order_number, status, order_type, branch_id, totals, created_at, item summaries |

### Filtering

Query params: `status`, `from`, `to`, `branchId` (must be user’s past branch only — informational), `q` (order_number prefix).

### Pagination

- Cursor or `limit` (default 20, max 50) + `offset` / `next_cursor`
- Stable sort: `created_at DESC, id DESC`

### Reorder support

1. `GET /api/v1/me/orders/:orderNumber` (or id) returns lines + modifier snapshots
2. Client runs existing `buildReorderPreview` against live catalog
3. Customer confirms via `ReorderReviewDialog` — **no silent substitution**
4. Cart filled → checkout

### Acceptance criteria

- [ ] Signed-in user sees server orders across devices
- [ ] Device-local list demoted to “This browser (legacy)” or removed after cutover
- [ ] Pagination works at >20 orders
- [ ] Reorder refreshes prices; unavailable lines skipped only after confirm
- [ ] User cannot read another user’s orders
- [ ] Guest track path unchanged

### APIs (target)

| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/v1/me/orders` | Bearer |
| `GET` | `/api/v1/me/orders/:orderNumber` | Bearer + ownership |

### Definition of Done — Order History

- [ ] `/me/orders` list + detail
- [ ] Hub + `/orders` wired to server
- [ ] Reorder path from server detail
- [ ] RBAC isolation tests
- [ ] **Production Ready ✅**

---

# Work Package 2 — Notifications

## Supported channels (Phase 1)

| Channel | Phase 1 | Notes |
|---|---|---|
| **Email** | ✅ Primary | Requires Owner SMTP checklist complete |
| **In-app inbox** | ✅ Keep | Persist server-side preferred; localStorage degrade only |
| **WhatsApp utility templates** | 🟡 Optional secondary | **Not** on `0304-1110495` ordering line; dedicated sender if used |
| **SMS** | ❌ Defer | Cost/ops |
| **Web Push** | ❌ Defer | P3 |

**Decision required in CP-0:** Email-only vs Email+WA.

## Architecture

```text
Order/Auth domain event
    → NotificationService.enqueue(event, userId, payload)
    → notification_outbox row (pending)
    → Worker / cron / queue consumer
    → Channel adapter (email | wa | inapp)
    → notification_deliveries status update
    → Retry with backoff OR dead-letter
```

**Principles:** idempotent per `(event_id, channel)`; never block checkout on send failure; customer prefs checked before send.

## Preferences

| Key | Default | Controls |
|---|---|---|
| `order_updates_email` | true (if email verified) | confirm, status changes, cancel |
| `order_updates_wa` | false until WA channel live | same |
| `marketing_email` | false | promos (Phase 1: store pref only, **do not send marketing** unless Owner opens) |
| `security_email` | true (non-disable or soft) | password/email change alerts |

Storage: `notification_preferences` (user_id PK) or columns on profile settings JSON with schema validation.

## Delivery status events (order)

| Event | When | Template |
|---|---|---|
| `order.placed` | After successful create | Order received + number |
| `order.confirmed` | Staff confirm | Preparing soon |
| `order.preparing` / `order.ready` | Kitchen | Optional (can collapse) |
| `order.dispatched` | Dispatch | On the way |
| `order.completed` | Complete | Delivered / collected |
| `order.cancelled` / `order.rejected` | Terminal | Honest reason class |

## Account events

| Event | Channel |
|---|---|
| Password changed | Email (security) |
| Email change confirm | Existing Supabase flows |
| (Future) phone verified | Defer with OTP |

## Retry strategy

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 min |
| 3 | 5 min |
| 4 | 30 min |
| Then | `failed` + ops visible count; no infinite retry |

Idempotency key: `event_id + channel`. Transient provider errors retry; permanent (bounce, invalid) → failed.

## Audit trail

Tables (conceptual):

- `notification_events` — what happened in domain
- `notification_outbox` / `notification_deliveries` — channel, status, provider_id, attempts, last_error, created_at, sent_at

Retention: ≥90 days for support; PII minimization in templates.

## Definition of Done — Notifications

- [ ] Channel decision documented + provider configured
- [ ] Prefs readable/writable from Settings/hub
- [ ] ≥ `order.placed` + one status update email live in staging/prod
- [ ] Retry + audit tables/tests
- [ ] Disabled “Coming Soon” toggles removed for live channels
- [ ] Checkout never fails because notify failed
- [ ] **Production Ready ✅**

---

# Work Package 3 — Settings

## Design

**Route:** `/settings` (canonical) with redirects from My Telepizza Security deep-links **or** My Telepizza gains a top-level **Settings** section that hosts the same components. Prefer **`/settings`** + nav entry for “module exists” audit clarity.

### Sections

| Section | Contents | Backend |
|---|---|---|
| **Profile** | full_name, phone (honest Unverified until OTP), email (read-only display + change flow link) | Existing `PATCH /auth/me/profile` |
| **Password** | Change password / Google set-password (existing Account patterns) | Supabase Auth |
| **Notification preferences** | Toggles from WP2 | Prefs API |
| **Privacy** | What data we store (copy); link to policy; export request **MVP = email support** OR deferred with honest “Contact support” | No fake self-serve delete without legal review |
| **Account management** | Logout; “Delete account” = **Owner-approved process** — Phase 1: request form → support ticket, not instant wipe | Documented SOP |

### UX

- Single page with section anchors
- Mobile: stacked sections
- Danger zone visually separated
- No staff settings leaked

### Definition of Done — Settings

- [ ] `/settings` reachable from nav + My Telepizza
- [ ] Profile + password flows work (reuse proven components)
- [ ] Live notification prefs (post-WP2)
- [ ] Privacy + account sections honest (no fake delete)
- [ ] A11y + auth-required gate
- [ ] **Production Ready ✅**

---

# Work Package 4 — Search

## Review plan (harden in-menu search)

| Area | Requirement |
|---|---|
| **Accessibility** | Visible `<label>` or `aria-label="Search menu"`; focus ring; Escape clears; results count announced (`aria-live`) |
| **Performance** | Client filter OK at ≤100 items; debounce input 150–200ms; no network |
| **Filtering** | Name substring + active category; clear both controls; case-insensitive |
| **Empty states** | “No items match ‘…’” + clear search CTA; category-empty distinct copy |
| **Testing** | Static tests: filter combo, empty state strings, a11y attributes present in Menu.tsx |

**Non-goals for Phase 1:** dedicated `/search` route, fuzzy/typo tolerance, search API, voice.

### Definition of Done — Search

- [ ] A11y attributes + empty states shipped
- [ ] Debounced filter
- [ ] Static tests added
- [ ] Mobile UAT pass
- [ ] **Production Ready ✅** (Complete, not Partial)

---

# Work Package 5 — Favorites (full functional specification)

## 1. Purpose

Let signed-in customers save menu items for quick re-add; surface a Favorites list and hearts on Menu/Product.

## 2. Users & goals

| Users | Goals |
|---|---|
| Authenticated customer | Save/unsave; browse favorites; add to cart from list |
| Guest | Prompt login to save (no silent local-only favorites as SoT — optional session hint only) |

## 3. Functional requirements

| ID | Requirement |
|---|---|
| F-1 | Toggle favorite on product card and detail |
| F-2 | Favorites page `/favorites` and hub shortcut |
| F-3 | Persist per user in DB |
| F-4 | If item unpublished/removed, show “Unavailable” and allow unfavorite |
| F-5 | Add to cart from favorites opens configurator when modifiers required |
| F-6 | Count badge optional in nav |

## 4. Non-functional

- Branch-agnostic favorites (catalog SKU ids); availability resolved at add-time
- No prices stored on favorite row

## 5. Data model

```text
customer_favorites
  id uuid PK
  user_id uuid NOT NULL
  menu_item_id/code — prefer stable catalog code text NOT NULL
  created_at timestamptz
  UNIQUE (user_id, menu_item_code)
  RLS: own rows only
```

## 6. APIs

| Method | Path |
|---|---|
| `GET` | `/api/v1/me/favorites` |
| `PUT` | `/api/v1/me/favorites/:itemCode` (idempotent save) |
| `DELETE` | `/api/v1/me/favorites/:itemCode` |

## 7. UX flows

```text
Menu heart → if guest → login?next=/menu
         → if auth → optimistic UI → API
/favorites → grid of items → Configure / Add
Home “Customer Favorites” marketing block remains separate (curated), labeled as such
```

## 8. RBAC

Authenticated customer own data only; staff no access via `/me`.

## 9. Testing

- Isolation tests; idempotent PUT; unavailable item rendering; guest CTA

## 10. Documentation

- Customer help + API notes

## 11. Definition of Done — Favorites

- [ ] Schema + RLS + APIs
- [ ] Menu/detail hearts + `/favorites`
- [ ] Guest login prompt
- [ ] Unavailable handling
- [ ] Tests + smoke
- [ ] **Production Ready ✅**

---

# Work Package 6 — Reviews (full functional specification)

## 1. Purpose

Collect post-order star ratings + optional text for completed orders; optional public display later.

## 2. Users & goals

| Users | Goals |
|---|---|
| Customer | Rate completed order (and optionally items) once |
| Staff/SA (minimal Phase 1) | Hide abusive reviews (flag) — MVP can be SA-only SQL/admin later |
| Public | **Phase 1 MVP:** reviews **account-private or order-private**; public product stars **optional P1.1** after moderation policy |

**Recommendation:** Phase 1 ships **order-level review** (1–5 + comment) visible to customer in hub; **public aggregation deferred** until moderation SOP signed (still “Reviews module Ready” if create/list-own works and abuse path documented).

## 3. Functional requirements

| ID | Requirement |
|---|---|
| R-1 | Prompt on order completed (hub + track success path) |
| R-2 | One review per order per user |
| R-3 | Stars 1–5 required; comment optional (max length) |
| R-4 | Edit within 24h; then locked |
| R-5 | Only `completed` orders reviewable
| R-6 | Profanity basic filter optional; report flag field |
| R-7 | No review without authentication matching `auth_user_id` |

## 4. Data model

```text
order_reviews
  id uuid PK
  order_id uuid UNIQUE NOT NULL → orders
  user_id uuid NOT NULL
  rating int CHECK 1–5
  comment text NULL
  status text CHECK IN ('visible','hidden','flagged') DEFAULT 'visible'
  created_at, updated_at
  RLS: customer CRUD own; public read deferred
```

## 5. APIs

| Method | Path |
|---|---|
| `POST` | `/api/v1/me/orders/:orderNumber/review` |
| `PATCH` | `/api/v1/me/orders/:orderNumber/review` (within window) |
| `GET` | `/api/v1/me/reviews` |
| `POST` | `/api/v1/me/reviews/:id/flag` (self-hide request) |

## 6. UX

- Dialog from Orders / Track when status completed and no review
- My reviews list under Settings or hub
- Honest: “Reviews help Telepizza improve — not published publicly yet” if public off

## 7. Moderation (MVP)

- Default visible to author
- `hidden` via service role / future admin
- No fake average stars on Menu until public mode on

## 8. Testing

- Cannot review another user’s order
- Cannot review non-completed
- Duplicate review rejected
- Edit window enforcement

## 9. Documentation

- Customer copy + moderation SOP (Owner)

## 10. Definition of Done — Reviews

- [ ] Schema + APIs + RLS
- [ ] Create/edit UX on completed orders
- [ ] List own reviews
- [ ] Public display either shipped with moderation **or** explicitly documented deferred with UI honesty
- [ ] Tests + smoke
- [ ] **Production Ready ✅**

---

# 4. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Owner delays Addresses / SMTP approval | Blocks WP1/WP2 | CP-0 decision deadline; escalate CEO |
| Notification provider flaky | Missed confirms | Outbox + retry; WA fallback already exists for ordering |
| Order history misses guest past orders | Support load | Document claim-later; phone track remains |
| Favorites on frozen catalog codes | Orphans after menu change | Unavailable state + unfavorite |
| Reviews abuse / legal | Brand risk | Private-by-default MVP; moderation SOP |
| Scope creep into wallets/OTP/ERP | Delay Phase 1 | Explicit out-of-scope list |
| Dual SoT during Addresses cutover | Confusion | Import banner + flag + close local writes |
| Performance of notify worker | Checkout latency | Async only |

---

# 5. Definition of Done — every remaining module

| Module | DoD summary |
|---|---|
| **Addresses** | Cloud SoT + APIs + hub/checkout + import + tests → ✅ |
| **Order History** (My Telepizza) | `/me/orders` + UI + reorder + isolation → ✅ |
| **Notifications** | Prefs + ≥1 channel + outbox/retry/audit + non-blocking → ✅ |
| **Settings** | `/settings` profile/password/prefs/privacy/account honesty → ✅ |
| **Search** | A11y + empty states + debounce + tests → Complete ✅ |
| **Favorites** | Hearts + `/favorites` + DB/API + guest CTA → ✅ |
| **Reviews** | Post-complete review + own list + policy honesty → ✅ |

**Program DoD**

- [ ] All module DoDs checked
- [ ] Full lifecycle evidence per sprint
- [ ] Production smoke: login → addresses → order → email/inbox notify → favorite → review
- [ ] Audit scoreboard updated to 100% under 12-module definition
- [ ] Close report: **Phase 1 PASS AND CLOSED**
- [ ] Phase 2 ERP explicitly unblocked by Owner/PM

---

# 6. Estimated milestones

| Milestone | Scope | Est. duration | Notes |
|---|---|---|---|
| **M0** | CP-0 approvals | 2–5 days | Owner calendar risk |
| **M1** | Search + Addresses | 1–2 weeks | Parallelizable |
| **M2** | Order History + reorder | 1–1.5 weeks | |
| **M3** | Notifications | 2–3 weeks | Provider-dependent |
| **M4** | Settings | 0.5–1 week | Mostly composition |
| **M5** | Favorites | 1 week | |
| **M6** | Reviews | 1–1.5 weeks | |
| **M7** | UAT + close | 0.5–1 week | |

**Total envelope:** ~7–12 weeks after M0 approvals (single squad).
**Fast-path risk:** Notifications/SMTP is the longest pole — start provider work on day 1 of M0.

---

# Appendix — Lifecycle checklist (every CP sprint)

```text
[ ] Plan (this program / slice brief)
[ ] Implement
[ ] Unit + API + static/RBAC tests
[ ] PR review (no auto-merge)
[ ] Merge
[ ] Migration/deploy
[ ] Production/staging smoke
[ ] Module close → Production Ready ✅
```

---

*Planning only — no application code and no PRs in this task.*
