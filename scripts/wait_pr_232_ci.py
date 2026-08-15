#!/usr/bin/env python3
"""Wait for PR #232 CI checks to complete, then report status.

Usage:
  GITHUB_TOKEN=ghp_xxx python3 scripts/wait_pr_232_ci.py
"""

from __future__ import annotations
import json
import os
import sys
import time
import urllib.request
import urllib.error

REPO = "mianimr4n/telepizza"
PR_NUMBER = 232
HEAD_SHA = "5c4aecee297fcc3b1fc4e56b751a9affda4771b5"
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN env var not set", file=sys.stderr)
    sys.exit(1)
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "telepizza-wait-ci/1.0",
}


def api_get(path: str):
    req = urllib.request.Request(f"https://api.github.com{path}", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    print(f"Waiting for CI checks on PR #{PR_NUMBER} (HEAD {HEAD_SHA[:8]})...")
    print()

    max_iterations = 60  # 60 * 30s = 30 min max
    for i in range(max_iterations):
        # Get check runs for the head SHA
        try:
            checks = api_get(f"/repos/{REPO}/commits/{HEAD_SHA}/check-runs?per_page=50")
        except urllib.error.HTTPError as e:
            print(f"  ! HTTP {e.code} fetching check runs: {e.read().decode()[:200]}")
            time.sleep(30)
            continue

        runs = checks.get("check_runs", [])
        if not runs:
            print(f"  [{i+1}/{max_iterations}] No check runs yet. Sleeping 30s...")
            time.sleep(30)
            continue

        # Status counts
        statuses = {}
        conclusions = {}
        for r in runs:
            s = r.get("status", "unknown")
            c = r.get("conclusion") or "pending"
            statuses[s] = statuses.get(s, 0) + 1
            conclusions[c] = conclusions.get(c, 0) + 1
            print(f"  - {r['name']}: status={s} conclusion={c}")

        completed = statuses.get("completed", 0)
        total = len(runs)
        print(f"\n  Progress: {completed}/{total} completed")
        print(f"  Statuses: {statuses}")
        print(f"  Conclusions: {conclusions}")

        if completed == total:
            print("\n=== ALL CHECKS COMPLETE ===")
            failures = conclusions.get("failure", 0) + conclusions.get("cancelled", 0) + conclusions.get("timed_out", 0)
            if failures == 0:
                print("✅ ALL CHECKS PASSED — safe to merge")
                return 0
            else:
                print(f"❌ {failures} CHECK(S) FAILED — review required")
                return 1

        print(f"\n  Sleeping 30s...\n")
        time.sleep(30)

    print("Timed out waiting for CI.")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
