# RC6 Command Center Action Registry

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`

## Action maturity states

| State | Meaning |
| --- | --- |
| INSIGHT_ONLY | Display only |
| DRILL_DOWN | Navigate with filters |
| DRAFT_ACTION | Creates draft / request; no final mutation |
| APPROVAL_REQUIRED | Second party must approve |
| DIRECT_EXECUTION | Authorized actor may execute with audit |

**Rule:** No action is executable based only on UI presence. Status requires API + authz + tests (+ Prod proof when mutating Production).

---

## Registry (representative)

| Action ID | Source widget | Roles | Entity | Mutation | Scope | Preconditions | Confirm | Re-auth | Approval | SoD | Idempotency | Duplicate prevention | Audit | Failure/retry | Rollback | Notify | Prod risk | Truth status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ACT-DRILL-ORDERS | W-ORD-01 | Owner, BM | orders | none | branch | authz | no | no | no | n/a | n/a | n/a | optional nav | n/a | n/a | no | low | DRILL_DOWN LIVE (DASH-02) |
| ACT-DRILL-KDS | W-KDS-01 | Owner, Kitchen | tickets | none | branch | authz | no | no | no | n/a | n/a | n/a | optional | n/a | n/a | no | low | DRILL_DOWN PARTIAL (DASH-02) |
| ACT-DRILL-DEL | W-DEL-01 | Owner, Delivery | deliveries | none | branch | authz | no | no | no | n/a | n/a | n/a | optional | n/a | n/a | no | low | DRILL_DOWN PARTIAL (DASH-02) |
| ACT-MODE-VIEW | Command modes | Owner, BM | dashboard | none | branch | authz | no | no | no | n/a | n/a | n/a | optional | n/a | n/a | no | low | INSIGHT_ONLY / DRILL_DOWN (DASH-03; advisory) |
| ACT-APR-INBOX | Approval Inbox | Owner, BM | approvals | none | branch | authz | no | no | no | n/a | n/a | n/a | optional nav | n/a | n/a | no | med | DRILL_DOWN only (DASH-04; no inline execute) |
| ACT-DRILL-BH | W-BH-01 | Owner, BM | branch health | none | branch | authz | no | no | no | n/a | n/a | n/a | optional nav | n/a | n/a | no | low | INSIGHT_ONLY + DRILL_DOWN (DASH-05; no override) |
| ACT-DEL-ASSIGN | W-DEL-01 | Delivery Mgr, BM | delivery | assign rider | branch | rider available; status pending | yes | no | no | avoid self-conflict rules TBD | Idempotency-Key | one active assignment | delivery audit | retry safe | reassign flow | rider notify **PROPOSED** | med | PARTIAL_LIVE (`POST .../assign`) |
| ACT-DEL-STATUS | W-DEL-01 | Delivery, Rider | delivery | status transition | branch | valid transition | yes on terminal | no | no | — | idempotent transition | reject illegal | audit | reject illegal | compensation TBD | optional | med | PARTIAL_LIVE (assigned/picked-up/delivered only) |
| ACT-DEL-FAIL | W-DEL-01 | Delivery | delivery | mark failed | branch | in lifecycle | yes | no | BM for high value **PROPOSED** | — | — | — | audit | — | return flow | customer msg **PROPOSED** | high | NOT_PRESENT in status API |
| ACT-POD-CAPTURE | W-DEL-01 | Rider | delivery | POD media | branch | picked up | yes | no | no | — | media hash | one POD set | audit | retry upload | — | — | high PII | NOT_PRESENT |
| ACT-COD-SETTLE | W-CASH-01 | BM, Finance | rider cash | settle COD | branch | delivered COD | yes | yes high $ | Finance **PROPOSED** | cashier≠approver | settle id | one open ledger | cash audit | — | reverse entry | — | high | NOT_PRESENT as product |
| ACT-INV-UNAVAIL | W-INV-01 | BM, Owner | menu item | mark unavailable | branch | item exists | yes | no | no | — | — | — | menu audit | — | re-enable | — | med | PARTIAL / menu module |
| ACT-PO-CREATE | W-PUR-01 | Purchasing, BM | PR/PO | create draft | org | stock trigger | yes | no | no | — | client key | — | purchasing audit | — | cancel draft | — | med | IMPLEMENTED_NOT_PROD_VERIFIED |
| ACT-PO-APPROVE | W-PUR-01 / W-APR-01 | Owner, Purchasing | PO | approve | org | draft exists | yes | yes | required | requester≠approver | — | — | audit | — | — | supplier **PROPOSED** | high | needs SoD proof |
| ACT-REFUND-APPROVE | W-CXL-01 | Owner, Finance | payment | refund | branch | order eligible | yes | yes | required | initiator≠approver | refund id | — | finance audit | — | — | customer | high | maturity APPROVAL; prove before LIVE |
| ACT-CASH-VAR-APPROVE | W-CASH-01 | BM, Finance | cash recon | approve variance | branch | recon open | yes | yes over limit | Finance over limit | counter≠approver | recon id | — | cash events | — | — | — | high | PARTIAL |
| ACT-EXC-ACK | W-EXC-01 | Owner, BM | exception | acknowledge | branch | open | no | no | no | — | ack id | — | event | — | — | — | low | PROPOSED (schema may be needed) |
| ACT-EXC-ASSIGN | W-RSK-01 | Owner | exception | assign owner | org | open | no | no | no | — | — | — | event | — | — | assignee | low | PROPOSED |
| ACT-COMPLAINT-OPEN | W-CMP-01 | Support, BM | complaint | create | branch | customer known | yes | no | no | — | — | — | CRM audit | — | — | — | med | PARTIAL / weak CRM |
| ACT-CONTACT-CUSTOMER | W-DEL-01 | Support, Delivery | customer | outbound call/msg | branch | order context | yes | no | no | — | — | rate limit | audit mask phone | — | — | provider | high PII | PROPOSED provider |
| ACT-REGISTER-CLOSE | W-EOD-01 | Cashier, BM | register | close | branch | Z ready | yes | yes | BM if variance | — | close id | one open | POS Z / cash | — | reopen policy | — | high | PARTIAL |
| ACT-EOD-PACK | W-EOD-01 | BM, Owner | branch day | generate pack | branch | checklist | yes | no | Owner optional | — | pack version | — | audit | — | — | — | med | PROPOSED DASH-07 |
| ACT-CFG-ACTIVATE | Settings | Owner | config version | activate | org/brand/branch | validated draft | yes | yes | dual for high risk | — | version id | — | config history | — | rollback new version | — | high | NOT_PRESENT (SET-08) |
| ACT-CFG-ROLLBACK | Settings | Owner | config | rollback | same | prior version | yes | yes | dual | — | new version id | — | history | — | — | — | high | NOT_PRESENT |
| ACT-AI-ACCEPT | W-AI-01 | Owner | recommendation | accept draft | org | AI draft | yes | no | required for exec | — | recommendation id | — | AI audit | — | — | — | med | PLANNED draft-only |

---

## Explicit non-claims

- Delivery status API does **not** currently execute failed/cancelled/POD/COD settle.
- Settings Foundation panels do **not** activate versioned configuration.
- AI recommendations must not DIRECT_EXECUTION without ADR + SoD.
