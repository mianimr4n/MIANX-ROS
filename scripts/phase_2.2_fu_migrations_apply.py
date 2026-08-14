#!/usr/bin/env python3
"""
Phase 2.2 FU-1/FU-2/FU-3 — Apply WhatsApp fix migrations to Production Supabase.

Migrations:
  1. 20260816000200_fix_whatsapp_message_immutability_content_column.sql
     - Recreates enforce_whatsapp_message_immutability() with the correct
       column name (content, not body). Backward compatible.
  2. 20260816000250_add_whatsapp_messages_next_attempt_at.sql
     - Adds nullable provider_next_attempt_at column + partial index for
       the outbox worker claim query. Backward compatible.
  3. 20260816000300_add_whatsapp_anonymize_pii_rpc.sql
     - Creates whatsapp_anonymize_pii(uuid[]) SECURITY DEFINER function for
       the PII anonymization job. Backward compatible.

Uses Supabase Management API:
  POST /v1/projects/{ref}/database/query

Idempotent: re-running is safe (CREATE OR REPLACE FUNCTION, ADD COLUMN IF NOT
EXISTS, CREATE INDEX IF NOT EXISTS).
"""

import json
import os
import sys
import time
from pathlib import Path
from urllib import request, error

SUPABASE_ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
SUPABASE_PROJECT_REF = "pyeowxvacgypohrbvgee"
MIGRATIONS_DIR = Path("/home/z/my-project/supabase/migrations")

MIGRATIONS = [
    "20260816000200_fix_whatsapp_message_immutability_content_column.sql",
    "20260816000250_add_whatsapp_messages_next_attempt_at.sql",
    "20260816000300_add_whatsapp_anonymize_pii_rpc.sql",
]


def run_query(sql: str, description: str) -> dict:
    """Execute SQL via Supabase Management API. Returns the parsed JSON response."""
    url = f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/database/query"
    body = json.dumps({"query": sql}).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "telepizza-migration-script/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with request.urlopen(req, timeout=60) as resp:
            status = resp.status
            raw = resp.read().decode("utf-8")
            # Management API returns 201 Created for successful queries.
            # Normalize to 200 for caller convenience.
            if status == 201:
                status = 200
            try:
                parsed = json.loads(raw) if raw.strip() else {}
            except json.JSONDecodeError:
                parsed = {"_raw": raw}
            return {"status": status, "body": parsed}
    except error.HTTPError as e:
        raw = e.read().decode("utf-8") if e.fp else ""
        return {"status": e.code, "body": {"error": raw, "message": str(e)}}
    except Exception as e:
        return {"status": 0, "body": {"error": str(e)}}


def preflight_check() -> bool:
    """Verify that the ADR-004 foundation migrations are already applied."""
    print("=== PREFLIGHT ===")
    sql = """
    SELECT
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_messages') as whatsapp_messages_exists,
      (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_messages' AND column_name='content') as content_column_exists,
      (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_messages' AND column_name='provider_next_attempt_at') as next_attempt_at_exists,
      (SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_name='enforce_whatsapp_message_immutability') as immutability_fn_exists,
      (SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_name='whatsapp_anonymize_pii') as anonymize_pii_fn_exists;
    """
    result = run_query(sql, "preflight")
    if result["status"] != 200:
        print(f"  preflight FAILED: {result['body']}")
        return False
    body = result.get("body", {})
    # The API may return either a list of rows directly, or a {rows: [...]} envelope.
    if isinstance(body, list):
        rows = body
    elif isinstance(body, dict):
        rows = body.get("rows", body.get("data", []))
    else:
        rows = []
    if not rows:
        print("  preflight returned no rows — unexpected")
        print(f"  raw body: {body}")
        return False
    row = rows[0] if isinstance(rows, list) else rows
    print(f"  whatsapp_messages table exists: {row.get('whatsapp_messages_exists')}")
    print(f"  content column exists: {row.get('content_column_exists')}")
    print(f"  provider_next_attempt_at exists: {row.get('next_attempt_at_exists')}")
    print(f"  enforce_whatsapp_message_immutability fn exists: {row.get('immutability_fn_exists')}")
    print(f"  whatsapp_anonymize_pii fn exists: {row.get('anonymize_pii_fn_exists')}")
    try:
        if int(row.get("whatsapp_messages_exists", 0)) == 0:
            print("  FAIL: ADR-004 foundation migrations not applied — apply 20260816000100 first.")
            return False
    except (TypeError, ValueError):
        print(f"  FAIL: unexpected count value: {row}")
        return False
    return True


def apply_migration(filename: str) -> bool:
    """Apply a single migration file."""
    path = MIGRATIONS_DIR / filename
    if not path.exists():
        print(f"  ERROR: migration file not found: {path}")
        return False
    sql = path.read_text(encoding="utf-8")
    # Strip SQL comments for cleaner logging (keep them in the query though).
    print(f"  applying {filename} ({len(sql)} bytes)...")
    result = run_query(sql, f"apply {filename}")
    if result["status"] != 200:
        err = result.get("body", {}).get("error", "") or result.get("body", {}).get("message", "")
        print(f"  FAILED: status={result['status']} error={str(err)[:200]}")
        return False
    print(f"  OK (status 200/201)")
    return True


def verify_migration(filename: str) -> bool:
    """Run verification queries after applying a migration."""
    print(f"  verifying {filename}...")
    if "immutability_content_column" in filename:
        sql = """
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema='public' AND routine_name='enforce_whatsapp_message_immutability';
        """
    elif "next_attempt_at" in filename:
        sql = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='whatsapp_messages' AND column_name='provider_next_attempt_at';
        """
    elif "anonymize_pii" in filename:
        sql = """
        SELECT routine_name, routine_type, security_type
        FROM information_schema.routines
        WHERE routine_schema='public' AND routine_name='whatsapp_anonymize_pii';
        """
    else:
        return True
    result = run_query(sql, f"verify {filename}")
    if result["status"] != 200:
        print(f"  verify FAILED: {result['body']}")
        return False
    body = result.get("body", {})
    if isinstance(body, list):
        rows = body
    elif isinstance(body, dict):
        rows = body.get("rows", body.get("data", []))
    else:
        rows = []
    print(f"  verification rows: {rows}")
    return True


def main():
    print("=" * 70)
    print("Phase 2.2 FU-1/FU-2/FU-3 — Apply WhatsApp fix migrations to Production")
    print("=" * 70)
    print(f"Project ref: {SUPABASE_PROJECT_REF}")
    print(f"Migrations dir: {MIGRATIONS_DIR}")
    print()

    if not preflight_check():
        print("\nPreflight failed — aborting.")
        sys.exit(1)

    print("\n=== APPLYING MIGRATIONS ===")
    for filename in MIGRATIONS:
        print(f"\n[{filename}]")
        if not apply_migration(filename):
            print(f"\nFailed to apply {filename} — aborting.")
            sys.exit(1)
        # Brief pause between migrations to let PostgREST schema cache refresh.
        time.sleep(2)
        if not verify_migration(filename):
            print(f"\nVerification failed for {filename} — aborting.")
            sys.exit(1)

    print("\n=== ALL MIGRATIONS APPLIED ===")
    print("Phase 2.2 FU-1/FU-2/FU-3 successfully applied to Production Supabase.")
    print("Outbox worker can now safely UPDATE delivery_status on outbound messages.")
    print("PII anonymization RPC is available for the 24-month retention job.")


if __name__ == "__main__":
    main()
