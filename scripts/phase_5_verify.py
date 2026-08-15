#!/usr/bin/env python3
"""
Phase 5 Production Verification — Order Lifecycle (Sprint 4.4 / 4.5 / 4.6).

Verifies that Production Supabase has all the Phase 5 (Order Lifecycle) objects:
  - Tables: orders, order_items, order_status_logs, deliveries, delivery_state_transitions,
            kitchen_tickets
  - Columns: orders.auth_user_id, orders.cancel_reason_code, orders.cancel_note
  - Status enum: pending, confirmed, preparing, ready, dispatched, completed, cancelled
  - Functions: current_app_user_id, current_user_is_active, current_user_is_super_admin,
               current_user_branch_ids, current_user_has_branch_access
  - RLS enabled on orders, order_items, order_status_logs, deliveries
  - Permissions: order.manage, order.read, delivery.assign, delivery.update
"""

from __future__ import annotations
import json
import os
import sys
import urllib.request
import urllib.error

SUPABASE_TOKEN = os.environ.get("SUPABASE_PAT")
PROJECT_REF = "pyeowxvacgypohrbvgee"
BASE_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

HEADERS = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "User-Agent": "telepizza-phase5-verify/1.0",
    "Content-Type": "application/json",
}


def run_sql(sql: str) -> list[dict]:
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(BASE_URL, data=payload, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status == 201:
                return json.loads(resp.read().decode())
            return [{"_http_status": resp.status, "_body": resp.read().decode()}]
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ! HTTP {e.code}: {body[:200]}")
        return [{"_http_error": e.code, "_body": body}]
    except Exception as e:
        print(f"  ! ERR: {e}")
        return [{"_error": str(e)}]


def fetch_scalar(sql: str, default=None):
    rows = run_sql(sql)
    if rows and "_error" not in rows[0] and "_http_error" not in rows[0]:
        if rows[0]:
            return list(rows[0].values())[0]
    return default


def fetch_set(sql: str) -> set[str]:
    rows = run_sql(sql)
    out: set[str] = set()
    for r in rows:
        if not r or "_error" in r or "_http_error" in r:
            continue
        for v in r.values():
            if v is not None:
                out.add(str(v))
    return out


# -------------------------------------------------------------------
# Checks
# -------------------------------------------------------------------

PASS = 0
FAIL = 0
CHECKS = []


def check(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    CHECKS.append((name, ok, detail))
    if ok:
        PASS += 1
        print(f"  [PASS] {name}" + (f" — {detail}" if detail else ""))
    else:
        FAIL += 1
        print(f"  [FAIL] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    global PASS, FAIL

    print("=" * 70)
    print("Phase 5 Production Verification — Order Lifecycle")
    print(f"Project: {PROJECT_REF}")
    print("=" * 70)

    # -----------------------------------------------------------------
    # 1. Tables
    # -----------------------------------------------------------------
    print("\n[1/8] Tables")
    tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'orders', 'order_items', 'order_status_logs',
            'deliveries', 'delivery_state_transitions',
            'kitchen_tickets', 'kitchen_ticket_status_events'
          );
    """)
    for t in [
        "orders", "order_items", "order_status_logs",
        "deliveries", "delivery_state_transitions",
        "kitchen_tickets",
    ]:
        check(f"table {t} exists", t in tables, f"found={t in tables}")

    # -----------------------------------------------------------------
    # 2. Columns
    # -----------------------------------------------------------------
    print("\n[2/8] Columns on orders / deliveries")
    order_cols = fetch_set("""
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'orders';
    """)
    for col in [
        "auth_user_id",          # Sprint 4.4 Slice 2D
        "cancel_reason_code",    # Sprint 4.3 Phase B
        "cancel_note",
        "status",
        "branch_id",
        "order_type",
        "order_source",
        "order_number",
        "contact_phone",
        "contact_phone_e164",
        "customer_id",
    ]:
        check(f"orders.{col}", col in order_cols)

    # deliveries columns (ADR-007)
    del_cols = fetch_set("""
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'deliveries';
    """)
    for col in [
        "status", "rider_id", "branch_id", "order_id",
        "picked_up_at", "delivered_at",
    ]:
        check(f"deliveries.{col}", col in del_cols)

    # -----------------------------------------------------------------
    # 3. orders.status CHECK constraint — must include the 7 frozen values
    # -----------------------------------------------------------------
    print("\n[3/8] orders.status enum / CHECK")
    # orders.status is TEXT with CHECK constraint per architecture.
    # Inspect ALL CHECK constraints and verify the status one includes all 7 frozen values.
    all_check_rows = run_sql("""
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint
        where conrelid = 'public.orders'::regclass
          and contype = 'c';
    """)
    status_check_def = ""
    for r in all_check_rows:
        if not r or "_error" in r or "_http_error" in r:
            continue
        conname = r.get("conname", "").lower()
        defn = (r.get("def") or "").lower()
        # Match ONLY the orders.status CHECK constraint. The body of that constraint
        # contains all 7 frozen status values; payment_status_check contains 'pending'
        # but not 'cancelled'/'dispatched'. Use the body signature to disambiguate.
        if "cancelled" in defn and "dispatched" in defn and "preparing" in defn:
            status_check_def = defn
            break
    if not status_check_def:
        # Maybe status is a pg_enum type
        status_type = fetch_scalar("""
            select data_type from information_schema.columns
            where table_schema='public' and table_name='orders' and column_name='status';
        """, "")
        if status_type == "USER-DEFINED":
            enum_vals = fetch_set("""
                select enumlabel from pg_enum e
                join pg_type t on t.oid = e.enumtypid
                where t.typname in ('order_status', 'orderstate', 'order_status_enum');
            """)
            for v in ["pending", "confirmed", "preparing", "ready", "dispatched", "completed", "cancelled"]:
                check(f"orders.status enum has '{v}'", v in enum_vals, f"type=enum")
        else:
            check("orders.status CHECK constraint", False, f"no CHECK found; type={status_type}")
    else:
        for v in ["pending", "confirmed", "preparing", "ready", "dispatched", "completed", "cancelled"]:
            check(f"orders.status CHECK has '{v}'", v in status_check_def, "type=text+CHECK")

    # deliveries.status (ADR-007 — pending/assigned/picked-up/delivered/failed/cancelled)
    del_check_rows = run_sql("""
        select pg_get_constraintdef(oid) as def
        from pg_constraint
        where conrelid = 'public.deliveries'::regclass
          and contype = 'c'
          and pg_get_constraintdef(oid) ilike '%assigned%';
    """)
    del_check_def = ""
    for r in del_check_rows:
        if r and "def" in r:
            del_check_def = (r.get("def") or "").lower()
            break
    if del_check_def:
        for v in ["pending", "assigned", "picked-up", "delivered", "failed", "cancelled"]:
            check(f"deliveries.status CHECK has '{v}'", v in del_check_def, "type=text+CHECK")

    # -----------------------------------------------------------------
    # 4. Functions (Slice 2D helpers + ADR-007 delivery transitions)
    # -----------------------------------------------------------------
    print("\n[4/8] Functions")
    funcs = fetch_set("""
        select routine_name from information_schema.routines
        where routine_schema = 'public'
          and routine_name in (
            'current_app_user_id',
            'current_user_is_active',
            'current_user_is_super_admin',
            'current_user_branch_ids',
            'current_user_has_branch_access',
            'enforce_delivery_transition_append_only',
            'validate_delivery_state_transition',
            'emit_domain_event',
            'enforce_domain_events_append_only'
          );
    """)
    for f in [
        "current_app_user_id",
        "current_user_is_active",
        "current_user_is_super_admin",
        "current_user_branch_ids",
        "current_user_has_branch_access",
        "enforce_delivery_transition_append_only",
        "validate_delivery_state_transition",
        "emit_domain_event",
        "enforce_domain_events_append_only",
    ]:
        check(f"function {f}", f in funcs)

    # -----------------------------------------------------------------
    # 5. RLS enabled
    # -----------------------------------------------------------------
    print("\n[5/8] RLS enabled")
    rls_set = fetch_set("""
        select tablename from pg_tables
        where schemaname = 'public' and rowsecurity = true;
    """)
    for t in ["orders", "order_items", "order_status_logs", "deliveries"]:
        check(f"RLS enabled on {t}", t in rls_set)

    # -----------------------------------------------------------------
    # 6. RLS policies exist
    # -----------------------------------------------------------------
    print("\n[6/8] RLS policies")
    policies = run_sql("""
        select tablename, policyname from pg_policies
        where schemaname = 'public'
          and tablename in ('orders', 'order_items', 'order_status_logs', 'deliveries');
    """)
    policy_count = 0
    for p in policies:
        if "_error" in p or "_http_error" in p:
            continue
        policy_count += 1
    check("RLS policies exist on order tables", policy_count > 0, f"count={policy_count}")

    # -----------------------------------------------------------------
    # 7. Permissions (order.manage, order.read, delivery.assign, delivery.update)
    # -----------------------------------------------------------------
    print("\n[7/8] Permissions")
    perms = fetch_set("""
        select code from public.permissions
        where code in ('order.manage', 'order.read', 'delivery.assign', 'delivery.update');
    """)
    for p in ["order.manage", "order.read", "delivery.assign", "delivery.update"]:
        check(f"permission {p}", p in perms)

    # -----------------------------------------------------------------
    # 8. order_status_logs columns
    # -----------------------------------------------------------------
    print("\n[8/8] order_status_logs schema")
    osl_cols = fetch_set("""
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'order_status_logs';
    """)
    for col in [
        "id", "order_id", "from_status", "to_status",
        "actor_type", "actor_user_id", "reason_code", "note", "created_at",
    ]:
        check(f"order_status_logs.{col}", col in osl_cols)

    # -----------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"RESULT: {PASS} PASS · {FAIL} FAIL · {PASS + FAIL} total")
    print("=" * 70)
    if FAIL > 0:
        print("\nFailed checks:")
        for n, ok, d in CHECKS:
            if not ok:
                print(f"  - {n}: {d}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
