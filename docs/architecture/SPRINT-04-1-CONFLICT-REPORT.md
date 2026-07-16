# Sprint 4.1 Conflict Report — RESOLVED

**Status:** ✅ **RESOLVED** by owner R1–R4 (2026-07-16)  
**Original blockers:** C1 slice numbering · C2 O1–O12 approval state · C3 idempotency depth · C5 competing branch  

---

## Approved resolutions

| ID | Decision |
|---|---|
| **R1** | Quote + server pricing = **Sprint 4.2**. Sprint **4.1** = schema/state-machine foundation (as in PR #35 schema work). Relabel any “quote = 4.1” wording. |
| **R2** | O1–O12 **APPROVED** with recommended defaults. Architecture **APPROVED / FROZEN**. No silent O* changes. |
| **R3** | **A** — enforce `Idempotency-Key` on `POST /orders`. Same key+payload → original; same key+different → `409`. Quote non-creating; include `quoteId`/`expiresAt`. |
| **R4** | Continue **PR #35** workstream only. Do **not** use `feature/sprint-4-orders-pricing`. |

---

## Follow-up

Inventory and readiness: `SPRINT-04-1-CLOSE-AND-4-2-READINESS.md`
