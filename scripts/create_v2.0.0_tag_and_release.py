#!/usr/bin/env python3
"""Create annotated v2.0.0 tag on PR #232 merge commit + publish GitHub Release.

Usage:
  GITHUB_TOKEN=ghp_xxx python3 scripts/create_v2.0.0_tag_and_release.py
"""

from __future__ import annotations
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error

REPO = "mianimr4n/telepizza"
MERGE_SHA = "6aaccc6a78ab05a78aa17a0cd98d8183e26f48e8"
TOKEN = os.environ.get("GITHUB_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN env var not set", file=sys.stderr)
    sys.exit(1)
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "telepizza-v2-release/1.0",
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

    # 2) Create annotated tag v2.0.0
    print("\n[2] Creating annotated tag v2.0.0...")
    tag_msg = (
        "v2.0.0 — Phase 5 Complete (Order Lifecycle) + Phase 3 OTP\n\n"
        "Phase 5 — Order Lifecycle — is FEATURE-COMPLETE and Production-verified (63/63 PASS).\n"
        "Phase 3 — Customer Phone / WhatsApp OTP — is FEATURE-COMPLETE (merged as PR #231).\n\n"
        "3 ADRs: ADR-016 (OTP Verification), ADR-017 (Phone-First Auth), ADR-018 (Order Lifecycle).\n"
        "All 18 ADRs (ADR-001 through ADR-018) Accepted v1.0 with standalone ADR files.\n\n"
        "Backend tests: 1096 passing (Phase 3 +92 included).\n"
        "Production migration tip: 20260821000000.\n"
        "Phase 5 Production verification: 63/63 checks PASS via scripts/phase_5_verify.py.\n\n"
        "Phase 6 (Admin & ERP Core) UNLOCKED."
    )
    git(["tag", "-a", "v2.0.0", "-m", tag_msg])
    git(["push", "origin", "v2.0.0"])
    print(f"  ✅ Tag v2.0.0 pushed")

    # 3) Publish GitHub Release
    print("\n[3] Publishing GitHub Release v2.0.0...")
    with open("/home/z/my-project/docs/releases/v2.0.0_RELEASE_NOTES.md") as f:
        body = f.read()

    payload = json.dumps({
        "tag_name": "v2.0.0",
        "target_commitish": "main",
        "name": "v2.0.0 — Phase 5 Complete (Order Lifecycle) + Phase 3 OTP",
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
            print(f"  ✅ Release published: {release['html_url']}")
            print(f"     ID: {release['id']}")
            print(f"     Tag: {release['tag_name']}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ! HTTP {e.code}: {body}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
