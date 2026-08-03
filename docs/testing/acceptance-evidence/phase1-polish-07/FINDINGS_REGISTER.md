# Findings register

| ID | Surface | Severity | Evidence | Fix | Residual |
| --- | --- | --- | --- | --- | --- |
| P11-PERF-01 | Public entry gzip | P2 | Baseline audit | Budget contract + lazy retain | Watch CI/prod |
| P11-PERF-02 | Public→Admin eager | P2 | App.tsx | Static guard test | — |
| P11-PERF-03 | Marketing JPG | P3 | public/images | Deferred | Image format later |
| P11-SEC-01 | Orders/CRM PII + exports | P1 | UI + API CSV | Logout LS clear; EOD safe; console sanitize | Backend sales CSV columns residual |
| P11-SEC-02 | Public analytics order IDs | P2 | No SDK | Confirmed absent | — |
| P11-SEC-03 | Back after logout matrix | P2 | Owner smoke | Persistence clear | Extend headed matrix POLISH-QA |
| Polling hidden | KDS/Delivery | P2 | op-status | visibility pause | — |
| Duplicate identical reads | Network | P2 | request-share | Utility + abort | Opt-in call sites |

No P0 found. No unresolved P1 within frontend-only POLISH-07 scope (SEC-01 export contact columns require backend change — documented residual, authorized-role operational data).
