## Summary

- **Production error:** `42703 column order_items.name does not exist` (`ANALYTICS_ORDER_ITEMS_READ_FAILED`) from Analytics product module / Owner BI workspace.
- **Root cause:** `backend/api/src/services/analytics/engine.ts` selected `order_items.name`, which has never existed on the foundation schema.
- **Canonical source:** `order_items.product_name` (order-time snapshot, `NOT NULL`) + aggregation by `order_items.menu_item_id` (unchanged formula intent).
- **Exact fix:** select `menu_item_id, quantity, product_name`; aggregate via `aggregateTopItemsByMenuItemId`; blank snapshots → honest `Unavailable item name` (menu-delete safe, no N+1, no fabricated live-menu join).
- **Migration:** none (query/select fix only).
- **No ad-hoc Production SQL.** Deployment still requires explicit authorization after merge.

## Test plan

- [x] `pnpm check` PASS
- [x] `pnpm test` PASS (db 800 + backend 619)
- [x] `pnpm test:db` PASS
- [x] `git diff --check` PASS
- [x] Targeted Vitest analytics schema/api/registry PASS
- [ ] `pnpm rc1:gate` — blocked here by local API down (`ECONNREFUSED :4000`); re-run with local stack
- [ ] Playwright Analytics + axe — blocked here (no Chromium install / local stack); re-run with `pnpm exec playwright install` + local services

Evidence: `docs/testing/acceptance-evidence/rc4-analytics-order-item-name/`
