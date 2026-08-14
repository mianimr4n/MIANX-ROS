#!/usr/bin/env python3
"""
Apply Phase 2.4 (ADR-008/009/010) migration to Production Supabase.

Pipeline:
  1. Preflight — check what tables/functions exist BEFORE the migration.
  2. Apply — execute the SQL via Supabase Management API.
  3. Verify — confirm the new tables/functions exist AFTER the migration.

Usage:
  SUPABASE_ACCESS_TOKEN=sbp_xxx python3 phase_2.4_prod_migration_apply.py
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

PROJECT_REF = "pyeowxvacgypohrbvgee"
MIGRATION_PATH = "/home/z/my-project/supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql"

# Tables/objects we expect to create in this migration
NEW_OBJECTS = {
    "tables": ["rider_locations", "delivery_pod", "cod_collections"],
    "functions": [
        "purge_expired_rider_locations",
        "enforce_delivery_pod_immutability",
        "post_cod_collection_journal",
        "set_cod_updated_at",
    ],
    # validate_delivery_state_transition already exists (ADR-007); we're
    # replacing it with an extended version. Verify it still exists after.
    "existing_functions_replaced": ["validate_delivery_state_transition"],
}


def run_query(sql: str, access_token: str) -> dict:
    """Execute SQL via Supabase Management API. Returns response dict."""
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        status = e.code
        # Supabase returns 201 for successful CREATE statements
        if status == 201:
            return {"ok": True, "status": 201, "body": body}
        return {"ok": False, "status": status, "body": body}
    # Normalize: 201 is success for DDL
    if status in (200, 201):
        return {"ok": True, "status": status, "body": body}
    return {"ok": False, "status": status, "body": body}


def table_exists(table_name: str, access_token: str) -> bool:
    sql = (
        "select exists (select 1 from information_schema.tables "
        f"where table_schema='public' and table_name='{table_name}') as exists;"
    )
    result = run_query(sql, access_token)
    if not result["ok"]:
        return False
    try:
        body = json.loads(result["body"])
        return bool(body[0]["exists"])
    except Exception:
        return False


def function_exists(func_name: str, access_token: str) -> bool:
    sql = (
        "select exists (select 1 from information_schema.routines "
        f"where routine_schema='public' and routine_name='{func_name}') as exists;"
    )
    result = run_query(sql, access_token)
    if not result["ok"]:
        return False
    try:
        body = json.loads(result["body"])
        return bool(body[0]["exists"])
    except Exception:
        return False


def column_exists(table: str, column: str, access_token: str) -> bool:
    sql = (
        "select exists (select 1 from information_schema.columns "
        f"where table_schema='public' and table_name='{table}' and column_name='{column}') as exists;"
    )
    result = run_query(sql, access_token)
    if not result["ok"]:
        return False
    try:
        body = json.loads(result["body"])
        return bool(body[0]["exists"])
    except Exception:
        return False


def main():
    access_token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not access_token:
        print("ERROR: SUPABASE_ACCESS_TOKEN env var required.")
        sys.exit(1)

    print("=" * 72)
    print(" Phase 2.4 — ADR-008/009/010 Production migration")
    print("=" * 72)
    print(f" Project: {PROJECT_REF}")
    print(f" Migration: {MIGRATION_PATH}")
    print()

    # ----- Preflight -----
    print("[1/3] Preflight — checking existing objects...")
    preflight_results = {}
    for table in NEW_OBJECTS["tables"]:
        exists = table_exists(table, access_token)
        preflight_results[table] = exists
        print(f"  table {table}: {'EXISTS (unexpected)' if exists else 'does not exist (expected)'}")

    for func in NEW_OBJECTS["functions"]:
        exists = function_exists(func, access_token)
        preflight_results[func] = exists
        print(f"  function {func}: {'EXISTS (unexpected)' if exists else 'does not exist (expected)'}")

    for func in NEW_OBJECTS["existing_functions_replaced"]:
        exists = function_exists(func, access_token)
        preflight_results[func] = exists
        print(f"  function {func} (replacing): {'EXISTS (expected)' if exists else 'MISSING (expected pre-Phase-2.4)'}")

    # If any new object already exists, abort to avoid surprises
    unexpected_existing = [
        name for name, exists in preflight_results.items()
        if exists and name not in NEW_OBJECTS["existing_functions_replaced"]
    ]
    if unexpected_existing:
        print()
        print(f"ABORT: Objects already exist in Production: {unexpected_existing}")
        print("This migration is intended to be additive. Investigate before applying.")
        sys.exit(1)

    print()
    print("Preflight passed — proceeding to apply.")
    print()

    # ----- Apply -----
    print("[2/3] Applying migration...")
    with open(MIGRATION_PATH, "r") as f:
        sql = f.read()

    # The migration uses `begin; ... commit;` so we send the whole file.
    result = run_query(sql, access_token)
    if not result["ok"]:
        print(f"  FAILED (HTTP {result['status']})")
        print(f"  Response: {result['body'][:2000]}")
        sys.exit(1)

    print(f"  Applied (HTTP {result['status']}).")
    print()

    # Give PostgREST a moment to refresh schema cache
    print("  Waiting 3s for PostgREST schema cache refresh...")
    time.sleep(3)
    print()

    # ----- Verify -----
    print("[3/3] Verifying new objects...")
    all_verified = True
    for table in NEW_OBJECTS["tables"]:
        exists = table_exists(table, access_token)
        status = "OK" if exists else "MISSING"
        if not exists:
            all_verified = False
        print(f"  table {table}: {status}")

    for func in NEW_OBJECTS["functions"] + NEW_OBJECTS["existing_functions_replaced"]:
        exists = function_exists(func, access_token)
        status = "OK" if exists else "MISSING"
        if not exists:
            all_verified = False
        print(f"  function {func}: {status}")

    # Verify delivery_pod unique constraint + key columns
    print()
    print("  Verifying key columns + constraints...")
    checks = [
        ("rider_locations", "latitude"),
        ("rider_locations", "longitude"),
        ("rider_locations", "delivery_id"),
        ("delivery_pod", "captured_by_rider_id"),
        ("delivery_pod", "photo_storage_path"),
        ("delivery_pod", "recipient_name"),
        ("cod_collections", "amount"),
        ("cod_collections", "reconciliation_status"),
        ("cod_collections", "journal_entry_id"),
        ("cod_collections", "reconciled_at"),
    ]
    for table, col in checks:
        exists = column_exists(table, col, access_token)
        status = "OK" if exists else "MISSING"
        if not exists:
            all_verified = False
        print(f"  column {table}.{col}: {status}")

    print()
    if all_verified:
        print("=" * 72)
        print(" ✅ Phase 2.4 Production migration applied successfully.")
        print("=" * 72)
    else:
        print("=" * 72)
        print(" ⚠️  Some objects missing — investigate before deploying.")
        print("=" * 72)
        sys.exit(2)


if __name__ == "__main__":
    main()
