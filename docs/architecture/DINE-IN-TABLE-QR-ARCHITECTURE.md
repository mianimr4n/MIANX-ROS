# Dine-In Table & QR Ordering Architecture

**Status:** Design only — **not migrated**  
**Date:** 2026-07-18  
**Freeze class:** **REQUIRED BEFORE DATABASE FREEZE**  
**Constraint:** One logical `restaurant_tables` table for all branches — **never** create per-branch physical tables.

---

## 1. Goals

Enable secure table QR → guest/authenticated ordering for dine-in, multi-order sessions per table, and branch-isolated staff visibility — without breaking delivery/pickup.

## 2. `restaurant_tables`

```text
restaurant_tables
  id uuid PK
  branch_id uuid NOT NULL → branches
  table_number varchar(40) NOT NULL          -- human display ("12", "A3")
  display_name varchar(120)                   -- optional label ("Patio 2")
  seats integer CHECK (seats > 0)
  zone varchar(80)                            -- optional floor zone
  status text NOT NULL                        -- available | occupied | reserved | inactive
  qr_token_hash text NOT NULL                 -- hash only; never store raw token
  qr_token_version integer NOT NULL default 1
  qr_rotated_at timestamptz
  sort_order integer NOT NULL default 0
  is_active boolean NOT NULL default true
  created_at / updated_at
  UNIQUE (branch_id, table_number)
```

### QR token rules

| Rule | Detail |
|---|---|
| Generation | Cryptographically random opaque token (≥128 bits entropy) |
| Storage | **Hash only** (e.g. SHA-256 / HMAC with server secret) |
| Presentation | Raw token only in QR URL / print payload at issue/rotate time |
| Rotation | Increment `qr_token_version`, rehash, invalidate prior tokens |
| Lookup | Hash inbound token → match active row |
| Leak response | Rotate immediately; do not log raw tokens |

## 3. Public QR endpoint concepts (no UI this phase)

| Concept | Contract |
|---|---|
| Resolve | `GET /api/v1/public/tables/qr/:token` → branch summary + table display + whether session can open |
| Open session | `POST .../sessions` with token → creates/returns `dine_in_sessions` |
| Catalog | Same menu catalog scoped to resolved `branch_id` |
| Quote / create | Existing quote/create with `order_type=dine-in` + session + table binding |
| Abuse controls | Rate limit by IP + token hash; short-lived session cookie/JWT optional; no staff privileges via QR |

### Security contract

1. Token proves **table identity**, not staff/admin role.
2. Never trust client-supplied `branch_id` / `table_id` without token proof.
3. Session must match table’s `branch_id`.
4. Rotated tokens fail closed.
5. QR cannot escalate to `service_role` or staff permissions.
6. Payments / bill close remain staff/POS paths (see POS foundation).

## 4. `dine_in_sessions`

```text
dine_in_sessions
  id uuid PK
  branch_id uuid NOT NULL → branches
  restaurant_table_id uuid NOT NULL → restaurant_tables
  table_display_snapshot varchar(120) NOT NULL  -- frozen label at open
  status text NOT NULL                          -- open | billing | closed | cancelled
  opened_at timestamptz NOT NULL
  closed_at timestamptz
  opened_by_source text                         -- qr | pos | staff
  guest_party_size integer
  notes text
  created_at / updated_at
```

### Rules

| Rule | Detail |
|---|---|
| One active session per table | Partial unique index: `(restaurant_table_id) WHERE status IN ('open','billing')` |
| Multi-order | Many `orders` may reference one session |
| Branch match | `session.branch_id = table.branch_id = order.branch_id` |
| Close | Only when no unpaid required bill rules violated (POS phase may tighten) |

## 5. Order extensions (forward-only nullable)

On `orders` (additive columns — see Order Extensions section in remediation plan):

| Column | Purpose |
|---|---|
| `dine_in_session_id` | FK → `dine_in_sessions` (nullable) |
| `restaurant_table_id` | FK → `restaurant_tables` (nullable) |
| `table_display_snapshot` | Immutable display string for receipts/history |

### Validation by `order_type`

| `order_type` | Session / table columns |
|---|---|
| `delivery` | Must be NULL |
| `pickup` | Must be NULL |
| `dine-in` | Session + table **required** for QR/POS dine-in path; legacy website dine-in without table may remain NULL until cutover (owner gate) |

Recommend CHECK or API-enforced invariant; prefer API first, DB CHECK after cutover.

## 6. Backward compatibility

- Existing delivery/pickup rows untouched.
- Existing `order_type='dine-in'` without table/session remains valid until owner requires QR/POS binding.
- No change to WhatsApp delivery messaging.

## 7. RLS sketch

| Table | Policy intent |
|---|---|
| `restaurant_tables` | Public: **no** direct SELECT of token hashes; staff SELECT by branch; service_role DML |
| `dine_in_sessions` | Staff SELECT/UPDATE by branch; guests via API service_role only |
| QR resolve | API hashes token with service_role; never expose hash |

## 8. Explicit non-goals (this foundation)

- No Admin/POS/Kitchen UI
- No per-branch physical SQL tables
- No seat-level individual guest accounts required for V1
- No split-check UI (schema may reserve bill links later)
