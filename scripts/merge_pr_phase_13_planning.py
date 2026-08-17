#!/usr/bin/env python3
"""Squash merge PR #241 — Phase 13 Planning Document."""
import json
import os
import sys
import urllib.request

REPO = "mianimr4n/telepizza"
PR_NUMBER = 241
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN / GH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

COMMIT_TITLE = "docs(phase-13): planning document + 5 ADR candidates + owner decisions (#241)"

COMMIT_MESSAGE = """Phase 13 (AI and Automation) is UNLOCKED with all dependencies satisfied
(Phases 5-12 PASS AND CLOSED). User instruction: 'phir phase 13 shoro
karna' (start Phase 13 after dashboard refresh).

Audit findings (read-only Explore subagent + main agent synthesis):
- AI governance foundation SOLID: ADR-013/014/015 Accepted v1.0 since
  v1.9.0 (Phase 2.6). 7 tables + 1 RPC + 3 permissions shipped in
  migration 20260820000000.
- BIGGEST GAP: provider-proxy.ts (the AI HTTP client referenced in
  ADR-013) was NEVER BUILT. ~950 lines of supporting infra exist
  (pii-redaction + approval-service + prompt-log-service + platform)
  but 0 lines of actual LLM HTTP client. This BLOCKS all Phase 13 ADRs.
- aiMode env-var missing from config/env.ts (4 modes today: email/
  whatsapp/payment/webhook — no aiMode).
- Mianx.ai is a BRAND, not an LLM integration: 14 client-side
  deterministic rule cards rendered in AdminAiTeam.tsx (551 lines).
  6 seeded ai_teams DB rows are empty containers (0 agents seeded).

Phase 13 scope proposal — 5 candidate ADRs:
  ADR-042 — Demand Forecasting & Inventory Prediction Contract
  ADR-043 — Delivery Optimization & Auto-Dispatch Contract
  ADR-044 — Support AI & WhatsApp Sentiment Auto-Reply Contract
  ADR-045 — Marketing Automation & Campaign AI Contract
  ADR-046 — Fraud Signals & Mianx.ai Operational AI Teams Elevation

Cross-cutting prerequisite (BLOCKS all 5 ADRs):
  Build provider-proxy.ts (~400 lines) + wire aiMode into config/env.ts
  + new Operator Follow-up FU-12 (provision OPENAI_API_KEY /
  ANTHROPIC_API_KEY env vars per ADR-003 + seed ai_provider_configs).
  Estimated effort: 2-3 days.

5 owner decisions required (documented in §6 of planning doc):
  1. ADR count: 5 ADRs (proposed) vs 3 ADRs (consolidated)
  2. LLM provider: OpenAI vs Anthropic vs both
  3. Auto-dispatch action type: add delivery.auto_dispatch to CHECK
  4. Mianx agent -> team mapping (14 agents across 6 teams)
  5. Phase 13 sequencing

Implementation roadmap: Phase 13.0 (foundational) -> 13.1-13.5
(sequential ADRs) -> 13.6 (closeout). Total 37-53 engineering days
(~7-10 weeks). Versioning proposal: v3.0.0.

Files added:
- docs/14-phases/PHASE-13-PLANNING.md (~520 lines, 11 sections)
- worklog.md: phase-13-planning task entry
- 5 helper scripts (4 carried from v2.7.1 dashboard refresh +
  open_pr_phase_13_planning.py)

Read-only planning PR — no code, no migrations, no ADR files authored
yet. Awaiting owner review + decisions before implementation begins.

6/6 CI checks PASS (CodeQL, Vercel Preview, Typecheck and test, Owner
Playwright, Analyze, Dependency Scan)."""

payload = {
    "commit_title": COMMIT_TITLE,
    "commit_message": COMMIT_MESSAGE,
    "squash": True,
    "merge_method": "squash",
}

req = urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/merge",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    },
    method="PUT",
)
try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode("utf-8")
        print(f"HTTP {resp.status}")
        print(body)
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}", file=sys.stderr)
    sys.exit(1)
