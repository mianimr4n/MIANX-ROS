#!/usr/bin/env python3
"""Merge PR #232 (Phase 5 closeout) via squash merge.

Usage:
  GITHUB_TOKEN=ghp_xxx python3 scripts/merge_pr_232.py
"""

from __future__ import annotations
import json
import os
import sys
import urllib.request
import urllib.error

REPO = "mianimr4n/telepizza"
PR_NUMBER = 232
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN env var not set", file=sys.stderr)
    sys.exit(1)
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "telepizza-merge/1.0",
    "Content-Type": "application/json",
}


def main() -> int:
    # Verify all CI checks pass before merging
    print("[1] Verifying CI checks are green...")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/commits/5c4aecee297fcc3b1fc4e56b751a9affda4771b5/check-runs?per_page=50",
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
        "commit_title": "docs(v2.0.0): Phase 5 complete — ADR-018 + close report + roadmap update (#232)",
        "commit_message": "Phase 5 (Order Lifecycle) formally closed: ADR-018 accepted, Sprint 4.4 architecture elevated to ADR, Production verified 63/63 PASS, master roadmap updated, v2.0.0 release notes authored. All 18 ADRs (ADR-001 through ADR-018) Accepted v1.0.",
        "sha": "5c4aecee297fcc3b1fc4e56b751a9affda4771b5",
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
            print(f"  ✅ Merged: {result.get('message', 'OK')}")
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
