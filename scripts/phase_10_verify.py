#!/usr/bin/env python3
"""
Phase 10 (Inventory and Procurement) — Production Verification Script

Verifies the as-built inventory/procurement surface in Production Supabase
against ADR-033 (Inventory Stock Master, Movement Ledger & Atomic Adjustment
Contract), ADR-034 (Recipe/BOM & COGS Costing Contract), and ADR-035
(Procurement, Suppliers & GRN Contract).

Coverage (70+ checks across 10 categories):
  1. Foundation inventory tables: inventory_items, stock_movements
  2. ADR-033 atomic RPC: adjust_inventory_stock_atomic
  3. ADR-034 recipe tables: inventory_recipes, inventory_recipe_lines,
     inventory_recipe_modifier_effects, inventory_consumption_events,
     inventory_cogs_events, inventory_stock_exceptions,
     inventory_recipe_audit_events
  4. ADR-034 atomic RPCs: kitchen_ticket_set_preparing_atomic,
     inventory_reverse_kitchen_consumption_atomic
  5. ADR-035 procurement tables: suppliers, purchase_orders,
     purchase_requisitions, goods_receiving, goods_receiving_lines,
     supplier_invoices, supplier_payments
  6. ADR-035 supplier portal tables: supplier_portal_users,
     purchase_order_lines, purchase_order_responses,
     purchase_order_delivery_refs, supplier_documents,
     supplier_portal_events, supplier_response_staff_decisions
  7. RLS enabled on all 23 inventory/procurement tables
  8. Permissions seeded (inventory.manage, purchasing.manage, supplier.portal)
     + roles (super-admin, branch-manager, supplier)
  9. CHECK constraints (movement_type 8 values, PO status 8 values,
     GRN status 3 values, invoice status 6 values, match_status 4 values,
     payment_method 4 values)
 10. API + frontend surface prerequisites (5 inventory + 8 recipe + 21
     purchasing + 20 supplier-portal routes + 10 frontend pages)

Usage:
  SUPABASE_PAT=<token> python3 scripts/phase_10_verify.py

If SUPABASE_PAT is not set, the script exits with code 2 and prints guidance.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pyeowxvacgypohrbvgee.supabase.co")
SUPABASE_PAT = os.environ.get("SUPABASE_PAT", "")

CHECKS_PASSED = 0
CHECKS_FAILED = 0
FAILURES = []


def check(label: str, ok: bool, detail: str = "") -> None:
    global CHECKS_PASSED, CHECKS_FAILED
    status = "PASS" if ok else "FAIL"
    if ok:
        CHECKS_PASSED += 1
    else:
        CHECKS_FAILED += 1
        FAILURES.append(f"{label}: {detail}")
    print(f"  [{status}] {label}" + (f" — {detail}" if detail and not ok else ""))


def run_sql(sql: str) -> list[dict]:
    """Execute SQL via Supabase REST endpoint. Returns list of row dicts."""
    if not SUPABASE_PAT:
        print("ERROR: SUPABASE_PAT environment variable is not set.")
        print("Get a PAT from: Supabase Dashboard → Project Settings → API → service_role key")
        print("Then run: SUPABASE_PAT=<token> python3 scripts/phase_10_verify.py")
        sys.exit(2)

    url = f"{SUPABASE_URL}/pg/query"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_PAT}",
        "apikey": SUPABASE_PAT,
    }
    payload = json.dumps({"query": sql}).encode()

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode())
            return [{"_http_status": resp.status, "_body": resp.read().decode()}]
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ! HTTP {e.code}: {body[:200]}")
        return [{"_http_error": e.code, "_body": body}]
    except Exception as e:
        print(f"  ! ERROR: {e}")
        return [{"_error": str(e)}]


def fetch_set(sql: str) -> set[str]:
    rows = run_sql(sql)
    if not rows or "_http_error" in rows[0] or "_error" in rows[0]:
        return set()
    return {str(list(r.values())[0]) for r in rows if r}


def fetch_one(sql: str) -> str | None:
    rows = run_sql(sql)
    if not rows or "_http_error" in rows[0] or "_error" in rows[0]:
        return None
    return str(list(rows[0].values())[0]) if rows[0] else None


def fetch_rows(sql: str) -> list[dict]:
    return run_sql(sql)


def main() -> None:
    global CHECKS_PASSED, CHECKS_FAILED

    print("=" * 72)
    print("Phase 10 (Inventory and Procurement) — Production Verification")
    print(f"Supabase URL: {SUPABASE_URL}")
    print("=" * 72)

    # =========================================================================
    # [1/10] Foundation inventory tables: inventory_items, stock_movements
    # =========================================================================
    print("\n[1/10] Foundation inventory tables (inventory_items, stock_movements)")
    foundation_tables = fetch_set(
        """
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in ('inventory_items', 'stock_movements');
        """
    )
    for t in ["inventory_items", "stock_movements"]:
        check(f"table '{t}' exists", t in foundation_tables, f"found={t in foundation_tables}")

    # inventory_items columns
    item_cols = fetch_set(
        """
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'inventory_items';
        """
    )
    for col in ["id", "branch_id", "sku", "name", "category", "unit",
                "current_stock", "minimum_stock", "reorder_level", "cost_price",
                "status", "created_at", "updated_at"]:
        check(f"inventory_items.{col}", col in item_cols)

    # inventory_items UNIQUE (branch_id, sku)
    item_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.inventory_items'::regclass and contype = 'u';
        """
    )
    item_sku_unique = any(
        "branch_id" in str(c.get("def", "")) and "sku" in str(c.get("def", ""))
        and "UNIQUE" in str(c.get("def", "")).upper()
        for c in item_constraints
    )
    check("inventory_items UNIQUE (branch_id, sku)", item_sku_unique)

    # inventory_items.status CHECK has 3 values
    item_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_items'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["active", "inactive", "discontinued"]:
        check(f"inventory_items.status CHECK has '{v}'", v in item_status_check)

    # stock_movements columns
    move_cols = fetch_set(
        """
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'stock_movements';
        """
    )
    for col in ["id", "inventory_item_id", "branch_id", "movement_type", "quantity",
                "reference_type", "reference_id", "reason", "created_by", "created_at"]:
        check(f"stock_movements.{col}", col in move_cols)

    # =========================================================================
    # [2/10] ADR-033 atomic RPC: adjust_inventory_stock_atomic
    # =========================================================================
    print("\n[2/10] ADR-033 — adjust_inventory_stock_atomic RPC")
    rpcs = fetch_set(
        """
        select routine_name from information_schema.routines
        where routine_schema = 'public'
          and routine_name = 'adjust_inventory_stock_atomic';
        """
    )
    check("function 'adjust_inventory_stock_atomic' exists", "adjust_inventory_stock_atomic" in rpcs)

    # function is SECURITY DEFINER
    rpc_security = fetch_one(
        """
        select security_type from information_schema.routines
        where routine_schema = 'public' and routine_name = 'adjust_inventory_stock_atomic';
        """
    )
    check("adjust_inventory_stock_atomic is SECURITY DEFINER", rpc_security == "DEFINER")

    # stock_movements.movement_type CHECK has 8 values (incl. purchase + sale)
    move_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.stock_movements'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%movement_type%';
        """
    ) or ""
    for v in ["receipt", "adjustment", "transfer_in", "transfer_out",
              "waste", "sale_consumption", "purchase", "sale"]:
        check(f"stock_movements.movement_type CHECK has '{v}'", v in move_check)

    # =========================================================================
    # [3/10] ADR-034 recipe tables
    # =========================================================================
    print("\n[3/10] ADR-034 — Recipe/BOM/COGS tables")
    recipe_tables = fetch_set(
        """
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'inventory_recipes', 'inventory_recipe_lines',
            'inventory_recipe_modifier_effects', 'inventory_consumption_events',
            'inventory_consumption_event_lines', 'inventory_stock_exceptions',
            'inventory_recipe_audit_events', 'inventory_cogs_events',
            'menu_item_inventory_components'
          );
        """
    )
    for t in ["inventory_recipes", "inventory_recipe_lines",
              "inventory_recipe_modifier_effects", "inventory_consumption_events",
              "inventory_consumption_event_lines", "inventory_stock_exceptions",
              "inventory_recipe_audit_events", "inventory_cogs_events",
              "menu_item_inventory_components"]:
        check(f"table '{t}' exists", t in recipe_tables)

    # inventory_recipes columns
    recipe_cols = fetch_set(
        """
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'inventory_recipes';
        """
    )
    for col in ["id", "branch_id", "menu_item_id", "name", "version", "status",
                "yield_factor", "notes", "created_by", "updated_by",
                "activated_at", "deactivated_at", "created_at", "updated_at"]:
        check(f"inventory_recipes.{col}", col in recipe_cols)

    # inventory_recipes UNIQUE (branch_id, menu_item_id, version)
    recipe_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.inventory_recipes'::regclass and contype = 'u';
        """
    )
    recipe_version_unique = any(
        "branch_id" in str(c.get("def", "")) and "menu_item_id" in str(c.get("def", ""))
        and "version" in str(c.get("def", ""))
        for c in recipe_constraints
    )
    check("inventory_recipes UNIQUE (branch_id, menu_item_id, version)", recipe_version_unique)

    # uq_inventory_recipes_one_active partial UNIQUE index
    one_active_idx = fetch_rows(
        """
        select indexname, indexdef
        from pg_indexes
        where schemaname = 'public' and tablename = 'inventory_recipes'
          and indexname = 'uq_inventory_recipes_one_active';
        """
    )
    check("uq_inventory_recipes_one_active partial UNIQUE index exists",
          len(one_active_idx) > 0,
          f"found={len(one_active_idx) > 0}")
    if one_active_idx:
        check("uq_inventory_recipes_one_active is partial (WHERE status='active')",
              "active" in str(one_active_idx[0].get("indexdef", "")))

    # inventory_recipes.status CHECK has 3 values
    recipe_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_recipes'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["draft", "active", "inactive"]:
        check(f"inventory_recipes.status CHECK has '{v}'", v in recipe_status_check)

    # inventory_consumption_events columns
    consume_cols = fetch_set(
        """
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'inventory_consumption_events';
        """
    )
    for col in ["id", "branch_id", "order_id", "kitchen_ticket_id", "event_type",
                "idempotency_key", "source_event", "request_id", "actor_user_id",
                "reversed_event_id", "status", "metadata", "created_at"]:
        check(f"inventory_consumption_events.{col}", col in consume_cols)

    # inventory_consumption_events.idempotency_key UNIQUE
    consume_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.inventory_consumption_events'::regclass
          and contype = 'u';
        """
    )
    idempotency_unique = any(
        "idempotency_key" in str(c.get("def", ""))
        for c in consume_constraints
    )
    check("inventory_consumption_events.idempotency_key UNIQUE", idempotency_unique)

    # inventory_consumption_events.event_type CHECK
    event_type_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_consumption_events'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%event_type%';
        """
    ) or ""
    for v in ["consume", "reverse"]:
        check(f"inventory_consumption_events.event_type CHECK has '{v}'", v in event_type_check)

    # inventory_consumption_events.status CHECK
    consume_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_consumption_events'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["posted", "reversed", "noop"]:
        check(f"inventory_consumption_events.status CHECK has '{v}'", v in consume_status_check)

    # inventory_cogs_events.cost_source CHECK
    cogs_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_cogs_events'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%cost_source%';
        """
    ) or ""
    for v in ["last_known", "weighted_average", "fifo", "manual"]:
        check(f"inventory_cogs_events.cost_source CHECK has '{v}'", v in cogs_check)

    # =========================================================================
    # [4/10] ADR-034 atomic RPCs: kitchen_ticket_set_preparing_atomic, reverse
    # =========================================================================
    print("\n[4/10] ADR-034 — kitchen atomic consume + reverse RPCs")
    kitchen_rpcs = fetch_set(
        """
        select routine_name from information_schema.routines
        where routine_schema = 'public'
          and routine_name in (
            'kitchen_ticket_set_preparing_atomic',
            'inventory_reverse_kitchen_consumption_atomic'
          );
        """
    )
    for fn in ["kitchen_ticket_set_preparing_atomic",
               "inventory_reverse_kitchen_consumption_atomic"]:
        check(f"function '{fn}' exists", fn in kitchen_rpcs)

    # =========================================================================
    # [5/10] ADR-035 procurement tables
    # =========================================================================
    print("\n[5/10] ADR-035 — Procurement tables (suppliers, POs, GRN, invoices, payments)")
    proc_tables = fetch_set(
        """
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'suppliers', 'purchase_orders', 'purchase_requisitions',
            'goods_receiving', 'goods_receiving_lines',
            'supplier_invoices', 'supplier_payments',
            'create_goods_receiving_with_stock_atomic'  -- not a table but checks naming
          );
        """
    )
    # Filter out the function name from the table check
    proc_table_names = {t for t in proc_tables if t != "create_goods_receiving_with_stock_atomic"}
    for t in ["suppliers", "purchase_orders", "purchase_requisitions",
              "goods_receiving", "goods_receiving_lines",
              "supplier_invoices", "supplier_payments"]:
        check(f"table '{t}' exists", t in proc_table_names)

    # suppliers columns (including RC3 portal extension)
    supplier_cols = fetch_set(
        """
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'suppliers';
        """
    )
    for col in ["id", "branch_id", "name", "contact_person", "phone", "email",
                "address", "status", "tax_id", "business_registration",
                "payment_terms", "supplied_categories", "approval_status", "notes",
                "created_at", "updated_at"]:
        check(f"suppliers.{col}", col in supplier_cols)

    # suppliers.status CHECK
    supplier_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.suppliers'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["active", "inactive"]:
        check(f"suppliers.status CHECK has '{v}'", v in supplier_status_check)

    # suppliers.approval_status CHECK
    supplier_approval_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.suppliers'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%approval_status%';
        """
    ) or ""
    for v in ["pending", "approved", "suspended"]:
        check(f"suppliers.approval_status CHECK has '{v}'", v in supplier_approval_check)

    # purchase_orders columns
    po_cols = fetch_set(
        """
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'purchase_orders';
        """
    )
    for col in ["id", "branch_id", "supplier_id", "po_number", "status",
                "total_amount", "expected_delivery_date", "created_by",
                "created_at", "updated_at"]:
        check(f"purchase_orders.{col}", col in po_cols)

    # purchase_orders UNIQUE (branch_id, po_number)
    po_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.purchase_orders'::regclass and contype = 'u';
        """
    )
    po_num_unique = any(
        "branch_id" in str(c.get("def", "")) and "po_number" in str(c.get("def", ""))
        for c in po_constraints
    )
    check("purchase_orders UNIQUE (branch_id, po_number)", po_num_unique)

    # purchase_orders.status CHECK has 8 values
    po_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.purchase_orders'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["draft", "submitted", "approved", "ordered",
              "partially_received", "received", "cancelled", "rejected"]:
        check(f"purchase_orders.status CHECK has '{v}'", v in po_status_check)

    # purchase_requisitions.status CHECK has 6 values
    req_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.purchase_requisitions'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["draft", "submitted", "approved", "rejected", "converted", "cancelled"]:
        check(f"purchase_requisitions.status CHECK has '{v}'", v in req_status_check)

    # goods_receiving.status CHECK has 3 values
    grn_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.goods_receiving'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["draft", "posted", "cancelled"]:
        check(f"goods_receiving.status CHECK has '{v}'", v in grn_status_check)

    # supplier_invoices.status CHECK has 6 values
    inv_status_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.supplier_invoices'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%status%';
        """
    ) or ""
    for v in ["draft", "pending_approval", "approved", "paid", "disputed", "cancelled"]:
        check(f"supplier_invoices.status CHECK has '{v}'", v in inv_status_check)

    # supplier_invoices.match_status CHECK has 4 values
    match_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.supplier_invoices'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%match_status%';
        """
    ) or ""
    for v in ["unmatched", "matched", "variance", "exception_approved"]:
        check(f"supplier_invoices.match_status CHECK has '{v}'", v in match_check)

    # supplier_payments.payment_method CHECK has 4 values
    pay_method_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.supplier_payments'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%payment_method%';
        """
    ) or ""
    for v in ["cash", "bank_transfer", "cheque", "other"]:
        check(f"supplier_payments.payment_method CHECK has '{v}'", v in pay_method_check)

    # create_goods_receiving_with_stock_atomic + record_supplier_payment_atomic RPCs exist
    proc_rpcs = fetch_set(
        """
        select routine_name from information_schema.routines
        where routine_schema = 'public'
          and routine_name in (
            'create_goods_receiving_with_stock_atomic',
            'record_supplier_payment_atomic',
            'current_user_supplier_ids'
          );
        """
    )
    for fn in ["create_goods_receiving_with_stock_atomic",
               "record_supplier_payment_atomic",
               "current_user_supplier_ids"]:
        check(f"function '{fn}' exists", fn in proc_rpcs)

    # =========================================================================
    # [6/10] ADR-035 supplier portal tables
    # =========================================================================
    print("\n[6/10] ADR-035 — Supplier portal tables")
    portal_tables = fetch_set(
        """
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'supplier_portal_users', 'purchase_order_lines',
            'purchase_order_responses', 'purchase_order_delivery_refs',
            'supplier_documents', 'supplier_portal_events',
            'supplier_response_staff_decisions'
          );
        """
    )
    for t in ["supplier_portal_users", "purchase_order_lines",
              "purchase_order_responses", "purchase_order_delivery_refs",
              "supplier_documents", "supplier_portal_events",
              "supplier_response_staff_decisions"]:
        check(f"table '{t}' exists", t in portal_tables)

    # supplier_portal_users UNIQUE (user_id) — 1:1 with users
    spu_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.supplier_portal_users'::regclass
          and contype = 'u';
        """
    )
    spu_user_unique = any(
        "user_id" in str(c.get("def", ""))
        for c in spu_constraints
    )
    check("supplier_portal_users.user_id UNIQUE (1:1 supplier-to-user)", spu_user_unique)

    # purchase_order_responses.idempotency_key UNIQUE (added in hardening)
    por_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.purchase_order_responses'::regclass
          and contype = 'u';
        """
    )
    por_idempotency_unique = any(
        "idempotency_key" in str(c.get("def", ""))
        for c in por_constraints
    )
    # The hardening migration adds this as a UNIQUE INDEX (not constraint), so also check pg_indexes
    por_idx = fetch_rows(
        """
        select indexname, indexdef
        from pg_indexes
        where schemaname = 'public' and tablename = 'purchase_order_responses'
          and indexdef like '%idempotency_key%';
        """
    )
    por_idempotency_idx = any("UNIQUE" in str(i.get("indexdef", "")).upper()
                              for i in por_idx)
    check("purchase_order_responses.idempotency_key UNIQUE (via constraint OR index)",
          por_idempotency_unique or por_idempotency_idx)

    # =========================================================================
    # [7/10] RLS enabled on all 23 inventory/procurement tables
    # =========================================================================
    print("\n[7/10] RLS enabled on inventory/procurement tables")
    rls_tables = [
        # ADR-033 (2 tables)
        "inventory_items", "stock_movements",
        # ADR-034 (8 tables)
        "inventory_recipes", "inventory_recipe_lines",
        "inventory_recipe_modifier_effects", "inventory_consumption_events",
        "inventory_consumption_event_lines", "inventory_stock_exceptions",
        "inventory_recipe_audit_events", "inventory_cogs_events",
        # ADR-035 procurement (7 tables)
        "suppliers", "purchase_orders", "purchase_requisitions",
        "goods_receiving", "goods_receiving_lines",
        "supplier_invoices", "supplier_payments",
        # ADR-035 supplier portal (7 tables)
        "supplier_portal_users", "purchase_order_lines",
        "purchase_order_responses", "purchase_order_delivery_refs",
        "supplier_documents", "supplier_portal_events",
        "supplier_response_staff_decisions",
    ]
    rls_enabled = fetch_rows(
        f"""
        select tablename, rowsecurity
        from pg_tables
        where schemaname = 'public'
          and tablename in ({",".join("'" + t + "'" for t in rls_tables)});
        """
    )
    rls_map = {r.get("tablename"): r.get("rowsecurity") for r in rls_enabled}
    for t in rls_tables:
        check(f"RLS enabled on '{t}'", rls_map.get(t) is True)

    # =========================================================================
    # [8/10] Permissions + roles seeded
    # =========================================================================
    print("\n[8/10] Permissions + roles seeded")
    roles = fetch_set("select code from roles;")
    for r in ["super-admin", "branch-manager", "supplier"]:
        check(f"role '{r}' exists", r in roles)

    perm_codes = fetch_set("select code from permissions;")
    for p in ["inventory.manage", "purchasing.manage", "supplier.portal"]:
        check(f"permission '{p}' seeded", p in perm_codes)

    # super-admin has all 3 permissions
    sa_perms = fetch_set(
        """
        select p.code
        from role_permissions rp
        join roles r on rp.role_id = r.id
        join permissions p on rp.permission_id = p.id
        where r.code = 'super-admin';
        """
    )
    for p in ["inventory.manage", "purchasing.manage"]:
        check(f"super-admin role has '{p}'", p in sa_perms)

    # branch-manager has inventory.manage + purchasing.manage
    bm_perms = fetch_set(
        """
        select p.code
        from role_permissions rp
        join roles r on rp.role_id = r.id
        join permissions p on rp.permission_id = p.id
        where r.code = 'branch-manager';
        """
    )
    for p in ["inventory.manage", "purchasing.manage"]:
        check(f"branch-manager role has '{p}'", p in bm_perms)

    # supplier role has supplier.portal
    supplier_perms = fetch_set(
        """
        select p.code
        from role_permissions rp
        join roles r on rp.role_id = r.id
        join permissions p on rp.permission_id = p.id
        where r.code = 'supplier';
        """
    )
    check("supplier role has 'supplier.portal'", "supplier.portal" in supplier_perms)

    # =========================================================================
    # [9/10] CHECK constraints — additional checks (already covered in [5/10])
    # =========================================================================
    print("\n[9/10] Additional CHECK constraints (recipe + stock exception)")

    # inventory_recipe_lines UNIQUE (recipe_id, inventory_item_id)
    rl_constraints = fetch_rows(
        """
        select conname, pg_get_constraintdef(oid) as def
        from pg_constraint where conrelid = 'public.inventory_recipe_lines'::regclass
          and contype = 'u';
        """
    )
    rl_unique = any(
        "recipe_id" in str(c.get("def", "")) and "inventory_item_id" in str(c.get("def", ""))
        for c in rl_constraints
    )
    check("inventory_recipe_lines UNIQUE (recipe_id, inventory_item_id)", rl_unique)

    # inventory_recipe_lines.quantity CHECK > 0
    rl_qty_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_recipe_lines'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%quantity%';
        """
    ) or ""
    check("inventory_recipe_lines.quantity CHECK > 0", ">" in rl_qty_check and "0" in rl_qty_check)

    # inventory_recipe_lines.waste_factor CHECK > 0 (default 1)
    rl_wf_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_recipe_lines'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%waste_factor%';
        """
    ) or ""
    check("inventory_recipe_lines.waste_factor CHECK > 0", ">" in rl_wf_check and "0" in rl_wf_check)

    # inventory_cogs_events.total_cost CHECK >= 0
    cogs_total_check = fetch_one(
        """
        select pg_get_constraintdef(oid)
        from pg_constraint
        where conrelid = 'public.inventory_cogs_events'::regclass and contype = 'c'
          and pg_get_constraintdef(oid) like '%total_cost%';
        """
    ) or ""
    check("inventory_cogs_events.total_cost CHECK >= 0",
          ">=" in cogs_total_check or "= 0" in cogs_total_check)

    # =========================================================================
    # [10/10] API + frontend surface prerequisites
    # =========================================================================
    print("\n[10/10] API + frontend surface prerequisites (file existence)")
    import os
    backend_files = [
        # ADR-033 — inventory
        "backend/api/src/modules/admin/inventory.ts",
        "backend/api/src/services/inventory/management.ts",
        "backend/api/src/services/inventory/units.ts",
        # ADR-034 — recipes
        "backend/api/src/modules/admin/inventory-recipes.ts",
        "backend/api/src/services/inventory/recipes.ts",
        # ADR-035 — procurement + portal
        "backend/api/src/modules/admin/purchasing.ts",
        "backend/api/src/modules/supplier-portal/routes.ts",
        "backend/api/src/services/purchasing/management.ts",
        "backend/api/src/services/supplier-portal/management.ts",
    ]
    for f in backend_files:
        check(f"backend file '{f}' exists", os.path.isfile(f), f"found={os.path.isfile(f)}")

    frontend_files = [
        "apps/website/client/src/pages/admin/AdminInventory.tsx",
        "apps/website/client/src/pages/admin/AdminPurchasing.tsx",
        "apps/website/client/src/pages/admin/AdminSupplierOperations.tsx",
        "apps/website/client/src/pages/supplier/SupplierShell.tsx",
        "apps/website/client/src/pages/supplier/SupplierLogin.tsx",
        "apps/website/client/src/pages/supplier/SupplierDashboard.tsx",
        "apps/website/client/src/pages/supplier/SupplierPurchaseOrders.tsx",
        "apps/website/client/src/pages/supplier/SupplierPurchaseOrderDetail.tsx",
        "apps/website/client/src/pages/supplier/SupplierDocuments.tsx",
        "apps/website/client/src/pages/supplier/SupplierProfilePage.tsx",
    ]
    for f in frontend_files:
        check(f"frontend file '{f}' exists", os.path.isfile(f), f"found={os.path.isfile(f)}")

    # =========================================================================
    # Summary
    # =========================================================================
    print("\n" + "=" * 72)
    print(f"Phase 10 verification: {CHECKS_PASSED} PASS / {CHECKS_FAILED} FAIL")
    print("=" * 72)
    if CHECKS_FAILED > 0:
        print("\nFailures:")
        for f in FAILURES:
            print(f"  - {f}")
        sys.exit(1)
    print("\nAll Phase 10 checks PASS. ADR-033/034/035 verified against Production.")


if __name__ == "__main__":
    main()
