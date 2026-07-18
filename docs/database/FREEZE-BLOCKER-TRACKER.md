# Database V1 Freeze — Blocker Tracker

**Board:** Telepizza Database Freeze Remediation Board  
**Date:** 2026-07-18  
**Source of truth:** [PR #76](https://github.com/mianimr4n/telepizza/pull/76) · `_documentation-audit/reports/DATABASE-V1-FREEZE-REVIEW-BOARD.md`  
**Git baseline:** `origin/main` @ `9c1d21c` (Merge PR #68 — DB-R2 production close)  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Mode:** Docs-only remediation tracker — **no migrations, no production apply, no feature work, no Sprint 4.5**

**Applied truth (unchanged):** R0–R2 on `main` **and** linked remote through `20260718130200`.  
**Missing truth:** R3–R6 DESIGNED-ONLY in PRs #69–#72; restaurant tables absent on remote.

---

## Executive status

| Gate | Result |
|---|---|
| R0–R2 applied | **DONE** |
| R3–R6 merged + applied | **OPEN / BLOCKED** |
| PR hygiene (#71 pollution, #72 mega-stack, superseded/conflicting PRs) | **OPEN** |
| Post-apply restaurant security certification | **BLOCKED** (needs apply) |
| Owner deferrals (`kitchen_stations`, `pos_sessions`) | **OPEN** |
| **Database V1 Freeze** | **BLOCKED** |

---

## Master tracker

| Blocker ID | Priority | Description | Owner | Status | Dependencies | Action type | Blocking freeze? | Verification Steps | Completion Evidence |
|---|---|---|---|---|---|---|---|---|---|
| **B-01** | P0 | DB-R3 not on `main` / prod — `20260718140000` absent; `restaurant_tables` NULL | Human Owner + Platform | OPEN | B-09, B-10 (close hygiene first preferred) | Migration → Production apply → Verification | **YES** | After merge #69: `migration list --linked` shows `20260718140000`; `to_regclass('public.restaurant_tables')` NOT NULL; RLS on; `qr_token_hash` revoked from client roles | PR #69 MERGED; remote version present; schema check PASS |
| **B-02** | P0 | DB-R4 not on `main` / prod — `20260718150000` absent; `dine_in_sessions` NULL | Human Owner + Platform | OPEN | B-01 | Migration → Production apply → Verification | **YES** | Rebase #70 after #69; apply `20260718150000`; verify `dine_in_sessions`, branch-match trigger, one-active-session index | PR #70 MERGED (post-rebase); remote version present; schema check PASS |
| **B-03** | P0 | DB-R5 not on `main` / prod — `20260718160000` absent; `kitchen_tickets` / `kitchen_ticket_items` NULL | Human Owner + Platform | BLOCKED | B-05 (must depollute #71 first) | Migration → Production apply → Verification | **YES** | Merge **clean** R5 only; apply `20260718160000`; verify UNIQUE(`order_id`), branch-match, kitchen/BM policies | Clean #71 MERGED without `docs/team/**`; remote version present; schema check PASS |
| **B-04** | P0 | DB-R6 not on `main` / prod — `20260718170000` absent; `restaurant_bills` / `bill_orders` NULL | Human Owner + Platform | BLOCKED | B-02, B-03, B-06 | Migration → Production apply → Verification | **YES** | Rebase #72 to R6-only; apply `20260718170000`; verify one-open-bill-per-session; `bill_orders` UNIQUE(`order_id`) | Clean R6-only #72 MERGED; remote version present; schema check PASS |
| **B-05** | P0 | PR #71 scope pollution — tip `e63087b` ships ~47 `docs/team/**` paths; kitchen scope doc says schema migrations out of scope while shipping R5 | Platform (PR author) + Human Owner | OPEN | None (first in merge sequence) | Manual review | **YES** | Reset/split to kitchen-only (`443b695` lineage: migration + API + tests); move `docs/team/**` to separate docs PR or defer post-freeze; confirm tip ≠ `e63087b` | Diff of merge candidate has **zero** `docs/team/**`; board re-check PASS |
| **B-06** | P0 | PR #72 unsafe as merge/apply vehicle — stacks R3–R6 + inherits pollution SHAs `443b695`/`e63087b` | Platform (PR author) + Human Owner | BLOCKED | B-05, B-01, B-02, B-03 | Manual review | **YES** | Rebase onto main after clean R5; retain **only** `20260718170000` (+ R6 API/tests); do not mega-merge | #72 head is R6-only delta; no `docs/team/**`; no duplicate R3–R5 migration files |
| **B-07** | P0 | No post-apply restaurant security certification — QR/session/kitchen/POS RLS & hash revokes exist only in unmerged SQL | Security + Platform | BLOCKED | B-01, B-02, B-03, B-04 | Verification | **YES** | After full apply through `20260718170000`: re-run grants/RLS/DEFINER/hash-column privilege checks on linked prod; confirm no anon writes; RLS enabled on new tables | Linked security query pack PASS; freeze re-audit documents PASS |
| **B-08** | P1 | Owner gate on deferred objects — `kitchen_stations`, `pos_sessions` deferred vs earlier “REQUIRED” architecture language | Human Owner | OPEN | None (can run in parallel) | Documentation only / Architecture | **YES** (owner) | Written accept-as-deferred for V1 **or** schedule explicit slices before LOCK | Owner-signed note in freeze LOCK package (or scheduled migration PRs listed) |
| **B-09** | P1 | Superseded OPEN PRs create double-apply confusion — #65/#66 MERGEABLE though `20260718130000` / `20260718130100` already on remote | Human Owner | OPEN | None (do before feature merges) | Manual review | **YES** | Close #65 and #66 as superseded; no merge of migration content | Both PRs CLOSED; `migration list` still through `…130200` only (no duplicate apply) |
| **B-10** | P1 | Conflicting architecture PRs — #62/#64 `mergeable=false` / DIRTY (add/add on workflow, snapshot, menu-modifier docs) | Human Owner + Docs | OPEN | None (do before feature merges) | Manual review | **YES** | Close/supersede #62 and #64; do not resolve-and-merge stale remediation SQL | Both PRs CLOSED; no re-apply of pre-R0 designs |

---

## Classification detail (per blocker)

### B-01 — R3 tables/QR missing (P0)

| Field | Value |
|---|---|
| **Root cause** | Migration `20260718140000` never merged to `main` or applied; PR #69 still OPEN |
| **Impact** | No `restaurant_tables` / QR foundation; blocks R4 FK and all dine-in freeze path |
| **Risk** | Declaring freeze without R3 = false LOCK; QR builds against missing schema |
| **Required fix** | Owner-review → MERGE #69 → production apply `20260718140000` → verify |
| **Owner** | Human Owner + Platform |
| **Estimated effort** | 0.5–1 day (review + merge + gated apply) |
| **Blocking database freeze?** | **YES** |
| **Action type** | Migration · Production apply · Verification |

### B-02 — R4 dine-in sessions missing (P0)

| Field | Value |
|---|---|
| **Root cause** | Migration `20260718150000` not on main/prod; PR #70 OPEN and stacks R3 file |
| **Impact** | No `dine_in_sessions`; R6 bills cannot attach; dine-in order linkage absent |
| **Risk** | Out-of-order apply fails FKs; stacking duplicate R3 file if merged before #69 lands |
| **Required fix** | Rebase #70 onto main after #69 → MERGE → apply `20260718150000` → verify |
| **Owner** | Human Owner + Platform |
| **Estimated effort** | 0.5–1 day |
| **Blocking database freeze?** | **YES** |
| **Action type** | Migration · Production apply · Verification |

### B-03 — R5 kitchen tickets missing (P0)

| Field | Value |
|---|---|
| **Root cause** | Migration `20260718160000` not applied; PR #71 OPEN but **polluted** (see B-05) |
| **Impact** | No kitchen ticket tables; cannot certify kitchen RLS for freeze |
| **Risk** | Merging polluted tip contaminates `main` and freezes false governance signals |
| **Required fix** | Complete B-05 first → MERGE clean R5 → apply → verify |
| **Owner** | Human Owner + Platform |
| **Estimated effort** | 0.5 day after depollution |
| **Blocking database freeze?** | **YES** |
| **Action type** | Migration · Production apply · Verification |
| **Status note** | **BLOCKED** by B-05 |

### B-04 — R6 POS bills missing (P0)

| Field | Value |
|---|---|
| **Root cause** | Migration `20260718170000` not applied; PR #72 OPEN as mega-stack + pollution inherit |
| **Impact** | No `restaurant_bills` / `bill_orders`; POS freeze surface incomplete |
| **Risk** | Mega-merge lands four migrations + org docs in one shot — unreviewable |
| **Required fix** | Complete B-05/B-01/B-02/B-03 → rebase #72 to R6-only → MERGE → apply → verify |
| **Owner** | Human Owner + Platform |
| **Estimated effort** | 0.5–1 day after prerequisites |
| **Blocking database freeze?** | **YES** |
| **Action type** | Migration · Production apply · Verification |
| **Status note** | **BLOCKED** by B-02, B-03, B-06 |

### B-05 — PR #71 scope pollution (P0)

| Field | Value |
|---|---|
| **Root cause** | Pollution commit `e63087b` (“Activate AI development team governance…”) added on kitchen feature PR; head is pollution tip |
| **Impact** | False freeze signal (`DATABASE-V1-FREEZE-CHECKLIST`, kitchen scope saying migrations out of scope while shipping R5); contaminates #72 |
| **Risk** | Org-governance docs land as if freeze-ready while R3–R6 still designed-only |
| **Required fix** | Depollute: kitchen-only PR (migration + API + tests); defer/split `docs/team/**` |
| **Owner** | Platform (PR author) + Human Owner |
| **Estimated effort** | 0.5–1 day |
| **Blocking database freeze?** | **YES** |
| **Action type** | Manual review |
| **Board rule** | Do **not** merge tip `e63087b` |

### B-06 — PR #72 unsafe merge vehicle (P0)

| Field | Value |
|---|---|
| **Root cause** | #72 commit graph includes R3–R6 stack + inherits #71 kitchen and pollution SHAs |
| **Impact** | Cannot safely use #72 as single merge/apply path |
| **Risk** | Unreviewable blast radius; pollution propagates to main |
| **Required fix** | Reject mega-merge; rebase to R6-only after clean R5 on main |
| **Owner** | Platform (PR author) + Human Owner |
| **Estimated effort** | 0.5 day (rebase/hygiene) |
| **Blocking database freeze?** | **YES** |
| **Action type** | Manual review |
| **Status note** | **BLOCKED** until B-05 cleared and prior slices on main |

### B-07 — Post-apply restaurant security certification missing (P0)

| Field | Value |
|---|---|
| **Root cause** | R3–R6 RLS matrices / hash column revokes only exist in unmerged SQL; prod cannot be certified yet |
| **Impact** | Freeze completeness FAIL even if merges happen without re-audit |
| **Risk** | APPROVED declaration without live restaurant security evidence |
| **Required fix** | After A→B→C→D apply: full security re-check + freeze re-audit PASS |
| **Owner** | Security + Platform |
| **Estimated effort** | 0.5–1 day after stack applied |
| **Blocking database freeze?** | **YES** |
| **Action type** | Verification · Testing |
| **Status note** | **BLOCKED** until B-01…B-04 applied |

### B-08 — Owner deferral gate (P1)

| Field | Value |
|---|---|
| **Root cause** | `kitchen_stations`, `pos_sessions` deferred vs earlier architecture “REQUIRED” language without written accept |
| **Impact** | Freeze contract dispute mid-feature if stakeholders assume objects exist |
| **Risk** | Mid-stream scope fights; Admin/Kitchen/POS assumptions diverge |
| **Required fix** | Written owner accept for V1 deferral **or** schedule slices before LOCK |
| **Owner** | Human Owner |
| **Estimated effort** | Hours (decision) or multi-day (if slices required) |
| **Blocking database freeze?** | **YES** (owner gate) |
| **Action type** | Documentation only · Architecture |

### B-09 — Superseded OPEN apply PRs #65/#66 (P1)

| Field | Value |
|---|---|
| **Root cause** | R0/R1 content already on `main`/remote via later path; PRs remain MERGEABLE |
| **Impact** | Someone may treat them as pending applies |
| **Risk** | Double-apply / migration history confusion |
| **Required fix** | Close #65 and #66 as superseded — **do not merge** migration content |
| **Owner** | Human Owner |
| **Estimated effort** | Minutes |
| **Blocking database freeze?** | **YES** (governance / apply safety) |
| **Action type** | Manual review |

### B-10 — Conflicting architecture PRs #62/#64 (P1)

| Field | Value |
|---|---|
| **Root cause** | Add/add conflicts vs main on workflow, production snapshot, menu-modifier architecture docs; designs predate applied R0–R2 |
| **Impact** | Stale SSOT companions; cannot merge cleanly |
| **Risk** | Misleading remediation SQL reintroduced; governance noise |
| **Required fix** | Close/supersede both; fold any useful bits via later docs only if needed |
| **Owner** | Human Owner + Docs |
| **Estimated effort** | Minutes–hours |
| **Blocking database freeze?** | **YES** (merge-graph hygiene before feature slices) |
| **Action type** | Manual review |

---

## Non-blocking register (tracked, not freeze gates)

From Review Board risk register — **do not elevate to freeze blockers**:

| ID | Priority | Blocking freeze? | Note |
|---|---|---|---|
| RR-06 / catalog-era snapshots in closed #62/#64 | P1 | **NO** (once PRs closed) | Refresh snapshot **after** R3–R6 apply |
| RR-08 Catalog count drift | P2 | **NO** | Reconcile counts; no pricing edits in freeze window |
| RR-09 Analytics / loyalty / inventory | P3 | **NO** | Expected V2 — keep out of V1 freeze |

Performance (board ~70/100): **NON-BLOCKING** — missing domains block freeze, not indexes.

---

## Remediation roadmap (ordered)

Lowest risk / highest dependency first. **WHY** on each step.

| Step | Action | Clears | WHY this order |
|---|---|---|---|
| **0** | **Depollute #71** (B-05) — kitchen-only tip; split/defer `docs/team/**` | B-05 → unblocks B-03, B-06 | Pollution is the first merge-sequence gate; nothing restaurant-slice should land until tip ≠ `e63087b` |
| **1** | **Close superseded** #65/#66 (B-09) — no migration merge | B-09 | Eliminates double-apply confusion before any new apply window opens |
| **2** | **Close/supersede conflicting** #62/#64 (B-10) | B-10 | Clears DIRTY merge graph and stale pre-apply designs before R3 review |
| **3** | **Owner-review → MERGE #69** (B-01) → apply `20260718140000` | B-01 | R3 is FK foundation; board forbids R4 before R3 |
| **4** | **Rebase #70 → MERGE** (B-02) → apply `20260718150000` | B-02 | R4 needs `restaurant_tables`; R6 needs `dine_in_sessions` |
| **5** | **MERGE clean R5** (B-03) → apply `20260718160000` | B-03 | Only after B-05; operational freeze order keeps R5 before R6 |
| **6** | **Rebase #72 to R6-only → MERGE** (B-04, B-06) → apply `20260718170000` | B-04, B-06 | Reject mega-stack; apply only from clean `main` |
| **7** | **Security + schema re-audit** on linked prod through `20260718170000` (B-07) | B-07 | Live RLS/grants/hash revoke certification is freeze completeness |
| **8** | **Owner written accept/defer** for `kitchen_stations` / `pos_sessions` (B-08) | B-08 | Can parallelize earlier; required before LOCK declaration |
| **9** | Emit **LOCK** declaration only after PASS (fold #73/#74/#75/#76 as historical evidence) | Freeze gate | Board: do not merge audit PRs as “freeze PASS” signals |

**FORBIDDEN (unchanged from Review Board):**

- Merge polluted #71 tip `e63087b`
- Mega-merge #72 as substitute for steps 3–6
- Merge #65/#66 as if migrations were still pending
- Merge #62/#64 without conflict resolution (prefer close)
- Apply R4 before R3, or R6 before R4
- Apply from polluted branches — apply only from clean `main`
- Auto-merge any PR from this tracker
- Start Sprint 4.5 / Kitchen/POS/Admin/Staff/Rider/customer feature builds assuming frozen DB

**Estimated calendar to APPROVED (with gated human approvals):** ~1 week — not same-day.

---

## Action-type summary

| Action type | Blockers |
|---|---|
| Manual review | B-05, B-06, B-09, B-10 |
| Migration | B-01, B-02, B-03, B-04 |
| Production apply | B-01, B-02, B-03, B-04 |
| Verification | B-01, B-02, B-03, B-04, B-07 |
| Testing | B-07 (security re-audit pack) |
| Documentation only | B-08 (written deferral accept) |
| Architecture | B-08 (if owner schedules slices instead of defer) |

---

## Valid production apply sequence (reference)

Linked: `pyeowxvacgypohrbvgee` · Human Owner approval each step · forward-only · `migration list` + `db push --linked --dry-run` before every apply

```text
A. 20260718140000  (R3)  → restaurant_tables + QR hash
B. 20260718150000  (R4)  → dine_in_sessions + order FKs
C. 20260718160000  (R5)  → kitchen_tickets + kitchen_ticket_items   [clean #71 only]
D. 20260718170000  (R6)  → restaurant_bills + bill_orders           [R6-only #72]
E. Post-stack security re-check → freeze re-audit → LOCK path only if PASS
```

---

## Status legend

| Status | Meaning |
|---|---|
| OPEN | Work not started or waiting on owner action; not waiting on another incomplete blocker |
| IN_PROGRESS | Actively being remediating |
| BLOCKED | Cannot proceed until dependency blocker(s) clear |
| READY | Hygiene done; awaiting owner merge/apply gate |
| DONE | Merged/applied/verified with completion evidence |

**Current snapshot:** R0–R2 = DONE (historical). B-01/B-02/B-05/B-08/B-09/B-10 = OPEN. B-03/B-04/B-06/B-07 = BLOCKED.

---

## Cross-links

| Artifact | Location |
|---|---|
| Review Board decision | [PR #76](https://github.com/mianimr4n/telepizza/pull/76) · `_documentation-audit/reports/DATABASE-V1-FREEZE-REVIEW-BOARD.md` |
| War-room / R7 / enterprise audits | PRs #75 / #73 / #74 (hold; consistently BLOCKED) |
| Feature slices | #69 R3 · #70 R4 · #71 R5 (polluted) · #72 R6 (mega-stack) |
| Superseded / conflicting | #65/#66 close · #62/#64 close |

---

DATABASE V1 FREEZE: BLOCKED — REMEDIATION TRACKER ACTIVE
