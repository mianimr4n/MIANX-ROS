# RC5-TEST-01 Regression Guard Proof

## Method

In-memory mutation inside Vitest (`analytics-order-items-schema.test.ts`):

1. Load committed `engine.ts` source.
2. Replace `select("menu_item_id, quantity, product_name")` with `select("menu_item_id, quantity, name")` **in memory only**.
3. Run `analyzeAnalyticsOrderItemsSource` on the mutated string.
4. Assert violations include:

   `order_items.name is not a valid Analytics schema field; use product_name and preserve menu_item_id aggregation.`

5. Assert missing-`product_name` finding also fires for the quantity/top-item shape.
6. No committed runtime file was modified for the proof.

## Result

**ANALYTICS_SCHEMA_REGRESSION_GUARD_PROVEN**

Focused suite: `tests/analytics-order-items-schema.test.ts` — mutation case PASS (expects guard failure on mutated input).

Working tree after proof: only intended test/helper/evidence changes (no mutated runtime source left behind).
