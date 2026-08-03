# PII inventory

| Surface | Fields | Role | Notes |
| --- | --- | --- | --- |
| Orders / Delivery UI | name, phone, address | order.manage | Required for ops |
| CRM | name, phone | order.manage | Derived from orders |
| HR | employee identity | staff.* | Role gated |
| Finance | financial | finance.manage | Role gated |
| EOD pack | aggregates | owner | No customer PII |
| Sales CSV (API) | contact columns | reports | Backend residual — not changed this slice |
| Public analytics SDK | none found | — | P11-SEC-02 mitigated (no SDK) |
