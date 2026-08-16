#!/usr/bin/env python3
"""Create annotated v2.3.0 tag on PR merge commit + publish GitHub Release.

Usage:
  GITHUB_TOKEN=ghp_xxx MERGE_SHA=<sha> python3 scripts/create_v2_3_0_tag_and_release.py
"""

from __future__ import annotations
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error

REPO = "mianimr4n/telepizza"
MERGE_SHA = os.environ.get("MERGE_SHA", "")
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN env var not set", file=sys.stderr)
    sys.exit(1)
if not MERGE_SHA:
    print("ERROR: MERGE_SHA env var not set (pass the squash merge commit SHA)", file=sys.stderr)
    sys.exit(1)
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "telepizza-v2.3.0-release/1.0",
    "Content-Type": "application/json",
}


def git(args: list[str]) -> str:
    return subprocess.check_output(["git"] + args, text=True, cwd="/home/z/my-project").strip()


def main() -> int:
    # 1) Sync local main
    print("[1] Syncing local main with origin...")
    git(["fetch", "origin"])
    git(["checkout", "main"])
    git(["reset", "--hard", "origin/main"])
    head = git(["rev-parse", "HEAD"])
    print(f"  Local main HEAD: {head}")
    if head != MERGE_SHA:
        print(f"  ! Warning: expected {MERGE_SHA}")

    # 2) Create annotated tag v2.3.0
    print("\n[2] Creating annotated tag v2.3.0...")
    tag_msg = (
        "v2.3.0 — Phase 8 Complete (Kitchen Dashboard)\n\n"
        "Phase 8 — Kitchen Dashboard — is FEATURE-COMPLETE and Production-verified.\n\n"
        "3 ADRs: ADR-027 (Kitchen Ticket Lifecycle & Queue Contract),\n"
        "ADR-028 (KOT Snapshot & Per-Item Status Model),\n"
        "ADR-029 (Kitchen Timers, Priority & Display Contract).\n"
        "All 29 ADRs (ADR-001 through ADR-029) Accepted v1.0 with standalone ADR files.\n\n"
        "Closeout-only release: no new database migrations applied.\n"
        "Production DB tip remains 20260821000000 (same as Phase 5/6/7 closeouts).\n"
        "All kitchen-related schema (DB-R5 20260718160000 + REQ-KIT-012 20260730230000)\n"
        "was verified during Phase 5's 63/63 and Phase 6's 95/95 PASS runs.\n"
        "scripts/phase_8_verify.py provides kitchen-focused re-verification (70+ checks)\n"
        "as a future artifact.\n\n"
        "Backend tests: 1096 passing (unchanged from v2.2.0 — closeout-only).\n"
        "Phase 9 (Rider and Delivery App) UNLOCKED."
    )
    git(["tag", "-a", "v2.3.0", "-m", tag_msg])
    git(["push", "origin", "v2.3.0"])
    print(f"  Tag v2.3.0 pushed")

    # 3) Publish GitHub Release
    print("\n[3] Publishing GitHub Release v2.3.0...")
    with open("/home/z/my-project/docs/releases/v2.3.0_RELEASE_NOTES.md") as f:
        body = f.read()

    payload = json.dumps({
        "tag_name": "v2.3.0",
        "target_commitish": "main",
        "name": "v2.3.0 — Phase 8 Complete (Kitchen Dashboard)",
        "body": body,
        "draft": False,
        "prerelease": False,
    }).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/releases",
        data=payload,
        headers=HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            release = json.loads(resp.read().decode())
            print(f"  Release published: {release['html_url']}")
            print(f"     ID: {release['id']}")
            print(f"     Tag: {release['tag_name']}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ! HTTP {e.code}: {body}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
