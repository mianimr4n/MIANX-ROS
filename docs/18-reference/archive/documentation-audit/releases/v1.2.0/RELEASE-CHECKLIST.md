# RELEASE CHECKLIST — v1.2.0

**Release:** v1.2.0 (Sprint 2 Option B toppings)  
**Date:** 2026-07-15  
**Git SHA:** `697554a`  
**Status:** Release Freeze **APPROVED** — baseline **LOCKED** — tag push authorized

Legend: `[x]` done · `[ ]` remaining remote action

---

## A. Pre-release gates

- [x] Phase A code merged to `main` (PR #24)
- [x] Phase B production migrations applied and verified
- [x] Phase C live UX smoke **PASS**
- [x] Sprint 2 final report verified / updated
- [x] No application code changes in Release Phase
- [x] No database mutations in Release Phase
- [x] Sprint 3 does not touch frozen menu/pricing/catalog rules

## B–E. Production / catalog / Option B / artifacts

- [x] All Release Phase checks recorded in `RELEASE-v1.2.0.md`
- [x] `PRODUCTION-BASELINE-LOCKED.md` created (**KNOWN GOOD**)
- [x] Local git tag `v1.2.0` on `697554a`

## F. Git hygiene / freeze close-out

- [x] Tag points at production merge commit `697554a`
- [x] Release docs committed
- [x] Push tag `v1.2.0` to origin (authorized)
- [x] Official Sprint 2 close / production baseline frozen
- [ ] Sprint 3 implementation begins on `feature/sprint-3-auth` (auth scope only)

## Owner sign-off

| Role | Status | Date |
|---|---|---|
| Release owner | **APPROVED** (freeze) | 2026-07-15 |
