# Phase 2 Readiness Audit — Delivery and Rider Readiness

**Audit date:** 2026-08-04
**Status:** AUDIT — current truth + proposed scope

---

## Current Delivery Truth (Repository Evidence)

### Existing APIs

| Endpoint | Method | Auth | Role | Notes |
|---|---|---|---|---|
| `GET /api/v1/riders/assignments` | GET | JWT | All authenticated | List delivery assignments by branch/status |
| `POST /api/v1/riders/assignments/:id/assign` | POST | JWT | branch-manager, super-admin | Assign rider to delivery |
| `PATCH /api/v1/riders/assignments/:id/status` | PATCH | JWT | rider (own), branch-manager, super-admin | Update delivery status |
| `GET /api/v1/riders/roster` | GET | JWT | branch-manager, super-admin | List riders for branch |

### Existing Status Machine (Current)

```
pending → assigned → picked-up → delivered
```

States `assigned`, `picked-up`, `delivered` are implemented.
Missing: `out-for-delivery`, `failed`, `return-to-branch`, `cancelled`.

### Existing Persistence

- Delivery operations via `deliveries` or `delivery_assignments` table (inferred from `DeliveryOperationsDataSource`)
- Rider roster via `users` table (`user_type = 'rider'`) + `user_roles`
- No dedicated `rider_profiles` table
- No `rider_availability` table
- No `rider_locations` table
- No `delivery_attempts` table
- No `delivery_pod` (proof of delivery) table
- No `cod_collections` table

### Current UI (AdminDelivery.tsx)

- Route: `/admin/delivery`
- Components: DeliveryCards, DeliveryDrawer, DeliveryFilters, DeliveryInsights, DeliveryKPIs, DeliveryMapFoundation, DeliveryPerformance, DeliveryRiderPanel, DispatchQueue
- Uses `listDeliveryAssignments`, `listRiderRoster`, `assignDeliveryRider`, `updateDeliveryStatus`
- `DeliveryMapFoundation` — map placeholder (no real GPS)
- `OperationsDeferredNote` — deferred operations notice exists

### Role Permissions (Current)

From `canAccessAdminDelivery`, `canAssignDeliveries`, `canUpdateDeliveries` in admin-access lib:
- `canAccessAdminDelivery` — super-admin, branch-manager
- `canAssignDeliveries` — super-admin, branch-manager
- `canUpdateDeliveries` — rider (own), super-admin, branch-manager

### Customer Address/Phone Exposure

- Customer delivery address is visible to assigned rider (included in order details)
- No masking or privacy controls
- Customer phone: currently exposed to rider for delivery coordination

---

## Required Decisions (Phase 2.4)

**State machine:**
Proposed complete state machine:
```
created
  → pending (order placed)
  → assigned (rider assigned)
  → picked_up (rider has collected from branch)
  → out_for_delivery (rider en route)
  → delivered (successful delivery; POD recorded if required)
  → failed_attempt (delivery attempted; customer not available)
  → returned (returned to branch after failed delivery)
  → cancelled (order cancelled before dispatch)
```

**Allowed transitions:**
| From | To | Actor |
|---|---|---|
| pending | assigned | branch-manager |
| assigned | picked_up | rider |
| picked_up | out_for_delivery | rider |
| out_for_delivery | delivered | rider |
| out_for_delivery | failed_attempt | rider |
| failed_attempt | out_for_delivery | rider (retry) |
| failed_attempt | returned | rider / branch-manager |
| assigned | cancelled | branch-manager |
| pending | cancelled | branch-manager / system |

**Actor permissions:**
- Rider may only transition their own assigned delivery
- Branch-manager may reassign, cancel, mark returned
- Super-admin may do all of the above

**Idempotency:**
- Status transition endpoint uses `(delivery_id, to_status, actor_id)` uniqueness check
- Duplicate PATCH returns 200 with current state (not error)

**Location privacy:**
- GPS coordinates stored only while rider is active on delivery
- Retention: 24 hours after delivery completion, then delete
- No historical GPS trails retained beyond 24 hours

**GPS sampling and retention:**
- Sampling: 30-second intervals while out_for_delivery
- Retention: last known location + delivery trail for 24 hours
- No long-term GPS history

**POD data format:**
- Photo: JPEG uploaded to Supabase Storage; store URL reference in `delivery_pod`
- Signature: SVG path string (optional)
- Timestamp: server-assigned on upload; not client-provided
- Required: only when branch configuration `require_pod = true`

**COD ledger ownership:**
- Finance owns the ledger (journal entry)
- Delivery owns the `cod_collections` record (amount, collected_at, rider_id)
- Branch-manager reconciles COD float at end of shift (POS/Z-Report boundary)
- COD payment must trigger a finance posting (boundary event)

**Finance integration:**
- Delivery completion (delivered + COD) → emits `CodCollected` event
- Finance service listens → posts debit Cash / credit Revenue (or AR)

**Branch-zone relationship:**
- Zone is a branch-level configuration
- Rider is assigned to zones within their branch
- Zone determines dispatch eligibility

**Provider/map dependency:**
- Google Maps or equivalent required for ETA and route
- Phase 2.4 may implement without live GPS (simulated/manual ETA)
- Live GPS requires provider contract (deferred from core delivery state machine)

**Failed/return workflow:**
- failed_attempt: rider records failure reason from enum (customer_not_available, address_not_found, refused_delivery, other)
- After max_attempts (configurable, default 2): auto-transition to returned
- Returned order: branch-manager decides to cancel or schedule re-delivery

**Rider-device trust:**
- Rider uses same auth (Supabase JWT) as other staff
- No separate device trust mechanism in Phase 2.4
- GPS updates sent with JWT bearer; no device attestation

**Operational fallback when GPS unavailable:**
- Delivery management functions without GPS
- Map panel shows "Location unavailable" state
- ETA shows "Manual ETA" input field

---

## Proposed Data Model

### `rider_profiles` (new)
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id) UNIQUE NOT NULL
vehicle_type TEXT CHECK (vehicle_type IN ('motorcycle', 'bicycle', 'car', 'on_foot'))
license_number VARCHAR(50)
id_document_url TEXT
employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contractor'))
hire_date DATE
branch_id uuid REFERENCES branches(id)
is_available BOOLEAN DEFAULT false
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `rider_locations` (new — with retention policy)
```sql
id uuid PRIMARY KEY
rider_id uuid REFERENCES users(id) NOT NULL
delivery_id uuid REFERENCES deliveries(id)
latitude NUMERIC(10,8) NOT NULL
longitude NUMERIC(11,8) NOT NULL
recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- Row deleted by scheduled job 24h after delivery completion
```

### `delivery_attempts` (new)
```sql
id uuid PRIMARY KEY
delivery_id uuid REFERENCES deliveries(id) NOT NULL
attempt_number INTEGER NOT NULL
rider_id uuid REFERENCES users(id)
attempted_at TIMESTAMPTZ
failure_reason TEXT CHECK (failure_reason IN ('customer_not_available', 'address_not_found', 'refused_delivery', 'other'))
notes TEXT
```

### `delivery_pod` (new)
```sql
id uuid PRIMARY KEY
delivery_id uuid REFERENCES deliveries(id) UNIQUE NOT NULL
photo_url TEXT -- Supabase Storage URL
signature_data TEXT -- SVG path
recorded_by uuid REFERENCES users(id) -- rider
recorded_at TIMESTAMPTZ -- server-assigned
```

### `cod_collections` (new)
```sql
id uuid PRIMARY KEY
delivery_id uuid REFERENCES deliveries(id) UNIQUE NOT NULL
rider_id uuid REFERENCES users(id) NOT NULL
amount_collected NUMERIC(10,2) NOT NULL
currency VARCHAR(3) DEFAULT 'PKR'
collected_at TIMESTAMPTZ
settled_at TIMESTAMPTZ
settled_by uuid REFERENCES users(id)
finance_posting_id uuid REFERENCES finance_postings(id)
```

---

## Readiness Assessment

| Item | Status |
|---|---|
| Delivery assignment API | EXISTS |
| Basic status transitions | EXISTS (limited) |
| Rider roster API | EXISTS |
| Full state machine | MISSING |
| Rider profiles | MISSING |
| GPS/location tracking | MISSING |
| POD | MISSING |
| COD collection | MISSING |
| Failed delivery workflow | MISSING |
| ADR-007 (delivery state machine) required | YES |
| ADR-008 (rider location retention) required | YES |
| ADR-009 (POD format) required | YES |
| Phase 2.4 maturity | PARTIAL_LIVE → target LIVE |

**Verdict: READY TO PLAN — ADR-007, ADR-008, ADR-009 must be accepted. GPS/map provider selection is a dependency for full implementation but delivery state machine and POD can be implemented without live GPS.**
