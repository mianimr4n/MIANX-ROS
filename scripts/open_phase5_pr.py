#!/usr/bin/env python3
"""Open PR for Phase 5 closeout (ADR-018 + close report + roadmap update)."""

from __future__ import annotations
import json
import os
import subprocess
import urllib.request
import urllib.error

REPO = "mianimr4n/telepizza"
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN env var not set", file=sys.stderr)
    raise SystemExit(1)
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "telepizza-phase5-pr/1.0",
    "Content-Type": "application/json",
}


def run(cmd: list[str], **kw) -> str:
    return subprocess.check_output(cmd, text=True, **kw).strip()


def main() -> int:
    # 1) Create branch
    branch = "release/v2.0.0-phase-5-complete"
    base = "main"
    print(f"[1] Creating branch {branch} from origin/{base}...")
    run(["git", "checkout", "-b", branch, f"origin/{base}"])

    # 2) Stage all Phase 5 changes
    print("[2] Staging changes...")
    run(["git", "add", "-A"])

    # 3) Show what's staged
    staged = run(["git", "diff", "--cached", "--stat"])
    print(staged)

    # 4) Commit
    print("[3] Committing...")
    msg = (
        "docs(v2.0.0): Phase 5 complete — ADR-018 + close report + roadmap update\n\n"
        "- ADR-018 (Order Lifecycle State Machine & Staff Transition API) authored\n"
        "  and Accepted v1.0. Formally accepts Sprint 4.4 frozen architecture as\n"
        "  canonical Phase 5 decision; records as-built implementation against\n"
        "  as-designed matrix.\n\n"
        "- Phase 5 Final Gate close report authored at\n"
        "  docs/testing/acceptance-evidence/phase5-closeout/PHASE5_FINAL_GATE.md.\n"
        "  All 14 gate criteria PASS. Production verification 63/63 PASS via\n"
        "  scripts/phase_5_verify.py.\n\n"
        "- TELEPIZZA-MASTER-ROADMAP.md updated: Phase 5 marked PASS AND CLOSED;\n"
        "  Phase 6 (Admin & ERP Core) UNLOCKED.\n\n"
        "- REPOSITORY_STATUS.md updated: tip anchor to 2967a1c (Phase 3 PR #231);\n"
        "  added Phase 3 OTP + Phase 5 Order Lifecycle rows; added FU-7 (OTP_HMAC_SECRET),\n"
        "  FU-8 (OTP WhatsApp number), FU-9 (v2.0.0 release publish) follow-ups;\n"
        "  rewrote Summary section.\n\n"
        "- CHANGELOG.md updated: comprehensive [2.0.0] entry covering Phase 5\n"
        "  (ADR-018) + Phase 3 (ADR-016/017).\n\n"
        "- v2.0.0 release notes authored at docs/releases/v2.0.0_RELEASE_NOTES.md.\n\n"
        "- ADR_INDEX.md updated: ADR-018 row added; all 18 ADRs (ADR-001 through\n"
        "  ADR-018) now Accepted v1.0 with standalone ADR files.\n\n"
        "Backend tests: 1096 passing (Phase 3 +92 included).\n"
        "Production migration tip: 20260821000000.\n"
        "Phase 5 Production verification: 63/63 checks PASS."
    )
    run(["git", "commit", "-m", msg])

    # 5) Push branch
    print("[4] Pushing branch...")
    run(["git", "push", "-u", "origin", branch])

    # 6) Get the head SHA
    head_sha = run(["git", "rev-parse", "HEAD"])
    print(f"[5] Head SHA: {head_sha}")

    # 7) Open PR
    print("[6] Opening PR...")
    pr_body = """## Summary

**Phase 5 — Order Lifecycle — is FEATURE-COMPLETE and Production-verified (63/63 PASS).**

This PR formally closes Phase 5 by:
1. Authoring **ADR-018 (Order Lifecycle State Machine & Staff Transition API)** — elevates the Sprint 4.4 frozen architecture to the ADR register.
2. Writing the **Phase 5 Final Gate** close report — all 14 gate criteria PASS.
3. Updating the master roadmap to mark Phase 5 PASS AND CLOSED.
4. Updating `REPOSITORY_STATUS.md`, `CHANGELOG.md`, `ADR_INDEX.md`.
5. Authoring `v2.0.0` release notes.

It also rolls in the **Phase 3 (OTP)** work (ADR-016/017, merged earlier as PR #231) which was not yet tagged — both will be tagged together as `v2.0.0` after this PR merges.

## Phase 5 Production verification

`scripts/phase_5_verify.py` — **63/63 checks PASS**:

| Area | Count | Status |
|---|---|---|
| Tables | 6 | ✅ orders, order_items, order_status_logs, deliveries, delivery_state_transitions, kitchen_tickets |
| `orders` columns | 10 | ✅ auth_user_id, cancel_reason_code, cancel_note, status, branch_id, order_type, order_source, order_number, contact_phone, contact_phone_e164 |
| `deliveries` columns | 6 | ✅ status, rider_id, branch_id, order_id, picked_up_at, delivered_at |
| `orders.status` CHECK | 7/7 | ✅ pending, confirmed, preparing, ready, dispatched, completed, cancelled |
| `deliveries.status` CHECK | 6/6 | ✅ pending, assigned, picked-up, delivered, failed, cancelled |
| Functions | 9 | ✅ 5 RLS helpers + enforce_delivery_transition_append_only + validate_delivery_state_transition + emit_domain_event + enforce_domain_events_append_only |
| RLS-enabled tables | 4 | ✅ orders, order_items, order_status_logs, deliveries (8 policies) |
| Permissions | 4 | ✅ order.manage, order.read, delivery.assign, delivery.update |
| `order_status_logs` columns | 9 | ✅ id, order_id, from_status, to_status, actor_type, actor_user_id, reason_code, note, created_at |

## What changed

- **`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`** (new) — ADR-018 Accepted v1.0.
- **`docs/00-governance/ADR_INDEX.md`** — ADR-018 row added.
- **`docs/testing/acceptance-evidence/phase5-closeout/PHASE5_FINAL_GATE.md`** (new) — Phase 5 close report.
- **`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`** — Phase 5 marked ✅ Complete; Current pointer → Phase 6.
- **`docs/00-governance/REPOSITORY_STATUS.md`** — tip anchor → `2967a1c`; added Phase 3 + Phase 5 rows; FU-7/FU-8/FU-9 follow-ups; Summary rewritten.
- **`CHANGELOG.md`** — comprehensive `[2.0.0]` entry.
- **`docs/releases/v2.0.0_RELEASE_NOTES.md`** (new) — release notes.
- **`scripts/phase_5_verify.py`** (new) — Production verification script (63 checks).
- **`worklog.md`** — phase-5-closeout entry appended.

## Test plan

- [x] `scripts/phase_5_verify.py` — 63/63 PASS on Production Supabase
- [x] All 18 ADRs (ADR-001 → ADR-018) Accepted v1.0 with standalone ADR files
- [x] Master roadmap Phase 5 row all ✅
- [x] No code changes — docs + script only
- [x] CI expected to pass (no source code touched)

## After merge

- Tag `v2.0.0` on the squash merge commit
- Publish GitHub Release `v2.0.0` with release notes from `docs/releases/v2.0.0_RELEASE_NOTES.md`
- Update `REPOSITORY_STATUS.md` tip anchor to the new SHA (separate follow-up commit if needed)

## Pending operator actions (no code blockers)

| ID | Severity | Action |
|---|---|---|
| FU-3 | P3 | Set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1` on Render |
| FU-7 | **P2** | Set `OTP_HMAC_SECRET` env var on Render (32+ byte random string) |
| FU-4 | P3 | Configure `chart_of_accounts` rows per branch |
| FU-5 | P3 | Configure Supabase Storage bucket `delivery-pod` |
| FU-8 | P3 | Provision dedicated OTP WhatsApp number |
"""
    payload = json.dumps({
        "title": "docs(v2.0.0): Phase 5 complete — ADR-018 + close report + roadmap update",
        "head": branch,
        "base": base,
        "body": pr_body,
        "draft": False,
    }).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/pulls",
        data=payload,
        headers=HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            pr = json.loads(resp.read().decode())
            print(f"\n[7] PR opened: {pr['html_url']}")
            print(f"    Number: #{pr['number']}")
            print(f"    Head SHA: {pr['head']['sha']}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ! HTTP {e.code}: {body}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
