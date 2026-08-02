# RC6-DASH-08 — Final report

## Merge / baseline

| Item | Value |
| --- | --- |
| PR #188 head | `3f10613924d4b0dcec379cb44b7e471b18eb3aae` |
| Merge / DASH-08 baseline | `1dcc8ba076ac0aee56de021e3c30b156ebc8c068` |
| Branch | `feature/rc6-dash-08-what-changed-timeline` |
| Production deploy | none |
| Migrations | none |

## Delivery

Read-only Owner **What Changed?** summary + **Operational timeline** foundation:

- Since wording: device-local review baseline (never fake last login)
- Derived metric comparisons + list-derived timeline events
- Filters, drill-downs, mark/reset baseline
- No event mutation, AI, providers, realtime, or finalize

## Acceptance IDs

Widget registry: **W-CHG-01**, **W-TL-01** (foundation implemented in repo; not Production-verified).  
Criteria: **C-01…C-06** in `RC6_ACCEPTANCE_CRITERIA.md`.

## Rollback

Revert the DASH-08 PR / remove `lib/what-changed`, `WhatChangedPanel`, registry `what-changed` section, and evidence folder. Clear `telepizza.admin.whatChanged.v1` locally if desired. No DB rollback required.
