# RC3 Containment & Disaster Checks

| Scenario | Detection | Immediate containment | User-facing | Data repair | Audit | Escalation |
| --- | --- | --- | --- | --- | --- | --- |
| Failed migration | migrate error / health fail | halt deploy; keep old app revision | maintenance banner | restore backup | preserve pre-failure logs | Founder + CA |
| Finance posting duplication | unique constraint / recon fail | freeze payment posting APIs | honest error on pay | reverse duplicate journal via approved RPC | keep both event rows | Finance owner |
| Loyalty balance inconsistency | recon script / customer report | freeze burn/earn RPCs | unavailable loyalty actions | rebuild from ledger with audit note | append-only ledger | Founder |
| Campaign provider outage | provider errors / timeouts | stop submit workers | queued/failed visible | retry safe; never mark delivered | campaign events | Marketing owner |
| Supplier identity misconfig | portal login / wrong PO visibility | deactivate portal user | access denied | fix `supplier_portal_users` link | portal events | Procurement |
| Cross-supplier auth defect | isolation matrix / alert | revoke supplier sessions; disable portal routes | 403 | patch RLS/service; retest A/B | security incident log | Founder + CA |
| Attendance correction defect | HR audit / employee dispute | freeze correction approvals | unavailable | restore from original attendance + events | append-only history | HR owner |
| Payroll foundation defect | unexpected paid flag | disable payroll transitions | unavailable | no payment should exist; clear erroneous state with audit | payroll events | Founder |
| Owner widget outage | attention 503 | show unavailable (not zero) | “Data unavailable” | fix API dependency | N/A | Eng on-call |
| Storage-reference outage | document URL fetch fail | keep metadata; mark preview unavailable | honest unavailable | re-link URL refs | document events | Eng |

No destructive automatic rollback scripts were added in PR5.
