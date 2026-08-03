# Table and list results

| Surface | Result |
| --- | --- |
| Orders grid | Semantic table + sr-only caption + `aria-label` + overflow-x-auto |
| Delivery dispatch | Semantic table + caption + overflow-x-auto |
| Other ops/business tables | Existing overflow wrappers; P11-RESP-01 partially addressed |
| Empty states | AdminDataState — no empty invalid tables (Orders/Delivery) |
| Sticky thead | Retained where present |

No data-grid dependency added.
