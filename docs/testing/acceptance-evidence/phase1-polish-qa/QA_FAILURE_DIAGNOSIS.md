# POLISH-QA — QA failure diagnosis

| Failure | Class | Fix |
| --- | --- | --- |
| Delivery "Mark picked up" white on `bg-amber-600` contrast 3.2 | PRODUCT_RUNTIME_DEFECT | `bg-amber-800` / hover `amber-700` on DeliveryCards, DeliveryDrawer, OpsDispatch |
| Delivery delivered action `bg-emerald-600` white (borderline) | PRODUCT_RUNTIME_DEFECT (preemptive) | `bg-emerald-800` |
| Role homes `return null` when `!allowed` (blank after logout) | PRODUCT_RUNTIME_DEFECT | Wrap with `AdminShell` so Staff access required shows |
| Logout assertion used URL regex for page text | TEST_HARNESS_DEFECT | Align with Owner smoke Email / Staff access heading asserts |
| Responsive matrix `ERR_INSUFFICIENT_RESOURCES` | ENVIRONMENT_DEFECT | Goto once per path; resize viewports in place |
| Kitchen role Sign out missing | EXPECTATION_CONTRACT_MISMATCH | KDS shell uses **Logout** label — harness accepts Sign out\|Logout |
| Multi-role silent skip when Sign out absent | TEST_HARNESS_DEFECT | Require logout control visible |
| Locator strict-mode dual match (heading + login link) | TEST_HARNESS_DEFECT | `.first()` on denial locator |
| `rc1:gate` ECONNREFUSED :4000 | ENVIRONMENT_DEFECT | Restart API with `run-with-local-env.mjs` + `.env.local` |
| D4 full role-matrix login timeout | ENVIRONMENT_DEFECT / DATA_FIXTURE_DEFECT | API was down; D4 extras not seeded — enterprise multi-role suite used instead |

No BACKEND_OR_INFRA_BLOCKER requiring silent browser workaround.
