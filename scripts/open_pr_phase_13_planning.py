#!/usr/bin/env python3
"""Open PR #241 — Phase 13 Planning Document."""
import json
import os
import sys
import urllib.request

REPO = "mianimr4n/telepizza"
BRANCH = "phase-13-planning"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN / GH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

PR_BODY = """## Phase 13 (AI and Automation) — Planning Document

**User instruction:** *"phir phase 13 shoro karna"* (start Phase 13 after dashboard refresh). Dashboard refresh shipped as v2.7.1 (PR #240). Phase 13 planning now ready for owner review.

### Audit summary (read-only — Explore subagent + main agent)

- ✅ **AI governance foundation is SOLID**: ADR-013 (AI Provider Boundary) + ADR-014 (AI Approval Gate) + ADR-015 (AI Prompt Retention) all Accepted v1.0 since v1.9.0 (Phase 2.6). 7 tables + 1 RPC + 3 permissions shipped in migration `20260820000000`.
- ❌ **BIGGEST GAP: `provider-proxy.ts` was NEVER BUILT**. ADR-013 §"Implementation references" lists it as the canonical AI HTTP client, but only 4 supporting services exist (~950 lines: `pii-redaction` + `approval-service` + `prompt-log-service` + `platform`). **0 lines of actual LLM HTTP client.** This BLOCKS all Phase 13 ADRs.
- ❌ **`aiMode` env-var missing** from `config/env.ts` (4 modes today: email/whatsapp/payment/webhook — no `aiMode`).
- ⚠️ **Mianx.ai is a BRAND, not an LLM integration**: 14 client-side deterministic rule cards rendered in `AdminAiTeam.tsx` (551 lines). 6 seeded `ai_teams` DB rows are empty containers (0 agents seeded in `ai_agents`).
- ✅ **5 explicit AI deferrals in Phase 12 closeout ADRs** target Phase 13 (ADR-039 §8.2 push notifications · ADR-040 §8.4 rider push / §8.8 auto-dispatch · ADR-041 §8.12 kitchen prediction / §8.17 sentiment auto-reply).
- ✅ **Data foundation is MATURE** for most AI use cases (sales, inventory, delivery, finance, customer, WhatsApp 24-month retention).

### Phase 13 scope proposal — 5 candidate ADRs

| ADR | Title | Scope |
| --- | --- | --- |
| **ADR-042** | Demand Forecasting & Inventory Prediction Contract | 7/14/30-day demand forecast per menu_item × branch + low-stock forecast + reorder-timing + supplier lead-time prediction |
| **ADR-043** | Delivery Optimization & Auto-Dispatch Contract | Auto-dispatch engine (rider scoring) + ETA prediction + delivery SLA tracking |
| **ADR-044** | Support AI & WhatsApp Sentiment Auto-Reply Contract | Sentiment analysis per WhatsApp message + auto-reply bot + human handoff |
| **ADR-045** | Marketing Automation & Campaign AI Contract | Campaign scheduler + AI-assisted segment definition + content generation + send-time optimization |
| **ADR-046** | Fraud Signals & Mianx.ai Operational AI Teams Elevation Contract | Fraud-signal service + 14 Mianx agents seeded to DB + agent-execution runtime + LLM-backed reasoning |

### Cross-cutting prerequisite (BLOCKS all 5 ADRs)

Build `provider-proxy.ts` (~400 lines) + wire `aiMode` into `config/env.ts` + new Operator Follow-up **FU-12** (provision `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars per ADR-003 + seed `ai_provider_configs`). Estimated effort: 2-3 days.

### 5 owner decisions required

1. **ADR count**: 5 ADRs (proposed — clean 1:1 mapping for 8 scope items) vs 3 ADRs (consolidated — matches Phase 8-12 cadence but each ADR is ~30% larger)
2. **LLM provider**: OpenAI vs Anthropic vs both — gates `ai_provider_configs` seed + env var provisioning
3. **Auto-dispatch action type**: add `delivery.auto_dispatch` to `ai_action_approvals.action_type` CHECK constraint? (required for ADR-043; migration needed)
4. **Mianx agent → team mapping**: which of the 6 seeded `ai_teams` (executive / customer-experience / marketing / restaurant-operations / finance / analytics) does each of the 14 agents belong to?
5. **Phase 13 sequencing**: foundational build first (provider-proxy) then 5 ADRs in parallel, OR sequential?

### Implementation roadmap (proposed)

```text
Phase 13.0 — Foundational Build (BLOCKS all ADRs) — 2-3 days
Phase 13.1 — ADR-042 Demand Forecasting — 5-7 days
Phase 13.2 — ADR-043 Delivery Optimization + Auto-Dispatch — 7-10 days
Phase 13.3 — ADR-044 Support AI + WhatsApp Sentiment — 5-7 days
Phase 13.4 — ADR-045 Marketing Automation — 7-10 days
Phase 13.5 — ADR-046 Fraud Signals + Mianx Elevation — 10-14 days
Phase 13.6 — Closeout (PHASE13_FINAL_GATE + v3.0.0 release) — 1-2 days
```

**Total: 37-53 engineering days (~7-10 weeks at solo pace).**

### Versioning proposal

**v3.0.0** — first major release since Phase 4 (v1.7.0). Reflects:
1. First AI/LLM integration in Production
2. First new migrations since Phase 3 (Production DB tip advances from `20260821000000`)
3. First major-scope phase (5 ADRs vs 1-4 for prior phases)

### Files added

- `docs/14-phases/PHASE-13-PLANNING.md` (~520 lines, 11 sections)
- `worklog.md`: `phase-13-planning` task entry
- 4 helper scripts (carried over from v2.7.1 dashboard refresh): `open_pr_dashboard_refresh.py`, `wait_pr_dashboard_refresh_ci.py`, `merge_pr_dashboard_refresh.py`, `create_v2_7_1_tag_and_release.py`

### Read-only planning PR

No code, no migrations, no ADR files authored yet. Awaiting owner review + 5 decisions before implementation begins.

---

**Phase 13 unlock status:** UNLOCKED with all dependencies satisfied (Phase 5 ADR-018 · Phase 6 ADR-019/020/021/022 · Phase 7 ADR-023/024/025/026 · Phase 8 ADR-027/028/029 · Phase 9 ADR-030/031/032 · Phase 10 ADR-033/034/035 · Phase 11 ADR-036/037/038 · Phase 12 ADR-039/040/041).
"""

payload = {
    "title": "docs(phase-13): planning document + 5 ADR candidates + owner decisions",
    "head": BRANCH,
    "base": "main",
    "body": PR_BODY,
    "draft": False,
}

req = urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/pulls",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}", file=sys.stderr)
    sys.exit(1)

print(f"PR #{data['number']} opened: {data['html_url']}")
print(f"  head_sha: {data['head']['sha']}")
print(f"  mergeable_state: {data.get('mergeable_state')}")
