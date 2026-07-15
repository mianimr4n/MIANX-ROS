# ROLLBACK CHECKLIST — v1.2.0

**Release:** v1.2.0 (Sprint 2 Option B toppings)  
**Tagged commit:** `697554a`  
**Priority:** Prefer **app/config rollback** before destructive DB rollback.  
**Do not run automatically.** Owner/operator only.

---

## When to rollback

Trigger if any customer-critical failure after release:

- Public Menu shows a Toppings category/tab
- Topping SKUs appear as standalone purchasable products
- Customizer invents topping prices / wrong S/M/L / wrong slice price
- Catalog API loses `toppings` or wrong meta counts after a bad redeploy
- Behari shows invented size variants or wrong baseline price
- Widespread CORS / 401 / 403 / RLS menu failures

---

## R0 — Immediate mitigation (preferred)

1. [ ] Confirm failure with `verify-production-api.mjs` + browser menu hard refresh.
2. [ ] If website-only UI bug: **redeploy previous Vercel production deployment** for `telepizza-website`.
3. [ ] If API contract regression: **redeploy previous Render deploy** for `telepizza-api`.
4. [ ] Re-check `/readyz` and `/api/v1/menu/catalog` meta (13 / 58 / 3 / 40 / 7).
5. [ ] Document incident time, deployer, and evidence URLs.

**Success criteria:** customer menu + customizer + WhatsApp path restored without deleting DB rows.

---

## R1 — Git / deploy pin

1. [ ] Identify last known-good deploy before the faulty change.
2. [ ] Pin website + API to commit `697554a` (**v1.2.0**) if that was good, **or** previous release commit if v1.2.0 itself is bad.
3. [ ] Do **not** `git push --force` on `main`.
4. [ ] If local tag must be moved later, do so only with owner approval (annotated tag rewrite is exceptional).

---

## R2 — Feature containment (no DB delete)

If toppings data is wrong but catalog otherwise healthy:

1. [ ] Prefer fixing forward (repair SQL / hotfix) over delete.
2. [ ] Temporary contain by redeploying website build that hides customizer toppings **only if** approved emergency UX (not preferred; documents deliberate product degradation).
3. [ ] Keep Behari at 549 Starting Price; do not invent variants during rollback.

---

## R3 — Database rollback (last resort — destructive)

> Removes Option B topping catalog rows. **Irreversible without backup restore.**  
> Taken from repair migration guidance; run only after backup.

### Preconditions

1. [ ] Supabase backup / snapshot of `pyeowxvacgypohrbvgee` completed.
2. [ ] Owner written approval recorded.
3. [ ] API + website redeployed to a build that does **not** require `data.toppings` (or tolerates empty toppings).

### Manual SQL (do not auto-run)

```sql
-- WARNING: destructive Option B toppings teardown
delete from public.menu_item_variants
where menu_item_id in (
  select id from public.menu_items where product_type = 'topping'
);

delete from public.menu_items
where product_type = 'topping';

delete from public.menu_categories
where slug = 'toppings';

-- Restore product_type check WITHOUT 'topping' only if no topping rows remain.
-- alter table public.menu_items drop constraint if exists menu_items_product_type_check;
-- alter table public.menu_items add constraint menu_items_product_type_check check (
--   product_type in (
--     'pizza','burger','sandwich','wings','fries','wrap','pasta','side','drink','deal'
--   )
-- );
```

### Post-DB checks

1. [ ] Public categories = 13
2. [ ] Public items = 58
3. [ ] Topping SKUs = 0
4. [ ] Behari still 549 / Starting Price / 0 variants
5. [ ] API + website behave without toppings (customizer unavailable/empty is acceptable emergency state)

---

## R4 — Communication

1. [ ] Notify ops / owner of rollback level used (R0/R1/R2/R3).
2. [ ] Update Sprint 2 / release notes with rollback outcome.
3. [ ] Schedule forward fix; do **not** start Sprint 3 until customer menu is stable again.

---

## Do not

- Do not drop foundation tables.
- Do not rewrite old migration files in git history.
- Do not invent Behari size prices during emergency.
- Do not push destructive SQL from CI.
