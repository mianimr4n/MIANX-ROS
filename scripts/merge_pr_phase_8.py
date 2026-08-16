#!/usr/bin/env python3
"""Merge PR (Phase 8 closeout) via squash merge.

Usage:
  GITHUB_TOKEN=ghp_xxx HEAD_SHA=<sha> PR_NUMBER=<n> python3 scripts/merge_pr_phase_8.py
"""

from __future__ import annotations
import json
import os
import sys
import urllib.request
import urllib.error

REPO = "mianimr4n/telepizza"
PR_NUMBER = int(os.environ.get("PR_NUMBER", "235"))
HEAD_SHA = os.environ.get("HEAD_SHA", "")
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN env var not set", file=sys.stderr)
    sys.exit(1)
if not HEAD_SHA:
    print("ERROR: HEAD_SHA env var not set (pass the phase-8-closeout head SHA)", file=sys.stderr)
    sys.exit(1)
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "telepizza-merge-phase8/1.0",
    "Content-Type": "application/json",
}


def main() -> int:
    # Verify all CI checks pass before merging
    print(f"[1] Verifying CI checks are green for HEAD {HEAD_SHA[:8]}...")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/commits/{HEAD_SHA}/check-runs?per_page=50",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
        runs = data.get("check_runs", [])
        all_pass = True
        for r in runs:
            s = r.get("status", "")
            c = r.get("conclusion") or ""
            print(f"  - {r['name']}: {s}/{c}")
            if s != "completed" or c not in ("success", "neutral"):
                all_pass = False
        if not all_pass:
            print("\n  ! Not all checks passed — aborting merge")
            return 1
        print(f"\n  All {len(runs)} checks passed.")

    # Squash merge
    print(f"\n[2] Squash-merging PR #{PR_NUMBER}...")
    payload = json.dumps({
        "commit_title": f"docs(v2.3.0): Phase 8 complete — ADR-027/028/029 + close report + roadmap update (#{PR_NUMBER})",
        "commit_message": "Phase 8 (Kitchen Dashboard) formally closed: ADR-027 (Kitchen Ticket Lifecycle & Queue Contract), ADR-028 (KOT Snapshot & Per-Item Status Model), ADR-029 (Kitchen Timers/Priority/Display Contract) accepted. Closeout-only release — no new migrations; Production DB tip remains 20260821000000. All 29 ADRs (ADR-001 through ADR-029) Accepted v1.0.",
        "sha": HEAD_SHA,
        "merge_method": "squash",
    }).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/merge",
        data=payload,
        headers=HEADERS,
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            print(f"  Merged: {result.get('message', 'OK')}")
            print(f"  SHA: {result.get('sha', 'unknown')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ! HTTP {e.code}: {body}")
        return 1

    # Get the merge commit SHA from main
    print("\n[3] Fetching new main HEAD...")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/branches/main",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        branch = json.loads(resp.read().decode())
        sha = branch["commit"]["sha"]
        print(f"  New main HEAD: {sha}")
        print(f"  Commit message: {branch['commit']['commit']['message'].splitlines()[0]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
