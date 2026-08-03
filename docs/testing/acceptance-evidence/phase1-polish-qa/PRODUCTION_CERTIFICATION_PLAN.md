# POLISH-QA — Production certification plan

**Out of scope for this PR** (subsequent release task):

1. Merge POLISH-QA PR after required CI green
2. Deploy **exact merge SHA** to Production website (Vercel)
3. Production read-only verification (public + Owner smoke; no business mutations)
4. Confirm migration tip unchanged / no backend deploy required
5. Final closeout evidence
6. Create annotated **v1.5.1** only after Production verification

Until then:

- Phase 1.1 gate = **PENDING PRODUCTION CERTIFICATION** / **NOT PASSED**
- Production remains `v1.5.0` @ `830dbc8…` / `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom`
- Phase 2 **NOT STARTED**
- No tag movement in this task
