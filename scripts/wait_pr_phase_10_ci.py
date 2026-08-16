#!/usr/bin/env python3
"""
Wait for Phase 10 closeout PR CI checks to complete.

Polls the PR's check runs every 30s until all checks complete.
Exit 0 if all pass, exit 1 if any fail, exit 2 on timeout.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
PR_NUMBER = int(os.environ.get("PHASE10_PR_NUMBER", sys.argv[1] if len(sys.argv) > 1 else "237"))
MAX_WAIT_SECONDS = 1200  # 20 minutes
POLL_INTERVAL = 30

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "X-GitHub-Api-Version": "2022-11-28",
}

# Get PR head SHA
url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}"
req = urllib.request.Request(url, headers=headers, method="GET")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        pr = json.loads(resp.read().decode())
        head_sha = pr["head"]["sha"]
        print(f"PR #{PR_NUMBER} head SHA: {head_sha}")
except Exception as e:
    print(f"ERROR fetching PR: {e}")
    sys.exit(2)

start = time.time()
while time.time() - start < MAX_WAIT_SECONDS:
    url = f"https://api.github.com/repos/{REPO}/commits/{head_sha}/check-runs"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            runs = data.get("check_runs", [])
    except Exception as e:
        print(f"  ! error fetching check runs: {e}")
        time.sleep(POLL_INTERVAL)
        continue

    if not runs:
        print(f"  [{int(time.time() - start)}s] no check runs yet, waiting...")
        time.sleep(POLL_INTERVAL)
        continue

    completed = [r for r in runs if r.get("status") == "completed"]
    pending = [r for r in runs if r.get("status") != "completed"]

    print(f"  [{int(time.time() - start)}s] {len(completed)}/{len(runs)} completed, {len(pending)} pending")
    for r in runs:
        status = r.get("status", "?")
        conclusion = r.get("conclusion", "?")
        name = r.get("name", "?")
        print(f"    - {name}: status={status} conclusion={conclusion}")

    if len(pending) == 0:
        failures = [r for r in completed if r.get("conclusion") not in ("success", "neutral", "skipped")]
        if failures:
            print(f"\n{len(failures)} check(s) FAILED:")
            for f in failures:
                print(f"  - {f.get('name')}: {f.get('conclusion')}")
            sys.exit(1)
        else:
            print(f"\nAll {len(completed)} check(s) PASS.")
            sys.exit(0)

    time.sleep(POLL_INTERVAL)

print(f"\nTimeout after {MAX_WAIT_SECONDS}s")
sys.exit(2)
