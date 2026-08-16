#!/usr/bin/env python3
"""Poll PR #240 CI checks until all complete (max 20 min)."""
import json
import os
import sys
import time
import urllib.request

REPO = "mianimr4n/telepizza"
PR_NUMBER = 240
HEAD_SHA = "d76af3d04484e89c48abceed4d017be79c13515e"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN / GH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
}

def fetch_json(url):
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_checks():
    return fetch_json(
        f"https://api.github.com/repos/{REPO}/commits/{HEAD_SHA}/check-runs?per_page=100"
    )

def get_pr_status():
    data = fetch_json(f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}")
    return data.get("mergeable_state"), data.get("mergeable")

start = time.time()
max_wait = 1200  # 20 minutes
interval = 30

last_summary = ""
while time.time() - start < max_wait:
    checks = get_checks()
    runs = checks.get("check_runs", [])
    if not runs:
        print(f"[{int(time.time() - start)}s] no check runs yet, waiting...")
        time.sleep(interval)
        continue

    completed = [r for r in runs if r["status"] == "completed"]
    in_progress = [r for r in runs if r["status"] != "completed"]

    summary_lines = []
    for r in runs:
        name = r["name"]
        status = r["status"]
        conclusion = r.get("conclusion") or "—"
        summary_lines.append(f"  {name}: status={status} conclusion={conclusion}")
    summary = "\n".join(summary_lines)

    ms, m = get_pr_status()
    print(f"[{int(time.time() - start)}s] {len(completed)}/{len(runs)} completed · {len(in_progress)} in progress · mergeable_state={ms}")
    if summary != last_summary:
        print(summary)
        last_summary = summary

    if len(completed) == len(runs) and len(runs) >= 1:
        # All checks completed
        all_pass = all(r.get("conclusion") == "success" for r in completed)
        print(f"\n✅ ALL CHECKS COMPLETED. all_success={all_pass}")
        sys.exit(0 if all_pass else 1)

    time.sleep(interval)

print("\n⏰ Timeout waiting for CI", file=sys.stderr)
sys.exit(1)
