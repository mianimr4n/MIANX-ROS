# Analytics hotfix (final certification pack)

Canonical detail: `../rc4-production-cutover/ANALYTICS_HOTFIX.md`

## Summary

| Item | Value |
| --- | --- |
| PR | #163 |
| Merge / live SHA | `2f0e4326310e1036cc23a94d5573dd4d774eaf0f` |
| Render deploy | `dep-d9n75v15efls73a4j5hg` |
| Canonical column | `order_items.product_name` |
| Aggregation | `menu_item_id` |
| Migration / SQL | **none** |
| Production smoke | PASS |

Also includes health-probe fix from main (#162) on the same live SHA.
