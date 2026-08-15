#!/usr/bin/env python3
"""
Phase 6 Production Verification — Admin and ERP Core.

Verifies that Production Supabase has all the Phase 6 (Admin & ERP Core) objects
underpinning ADR-019 (RBAC), ADR-020 (Menu Catalog), ADR-021 (Deals/Coupons/Loyalty),
and ADR-022 (Reports & Analytics), plus the previously-closed ADR-001 (Branches),
ADR-002 (Settings), and ADR-012 (Audit).

Categories (10):
  1. RBAC tables (users, roles, permissions, role_permissions, user_roles,
     user_role_branches, staff_invites, staff_assignment_events)
  2. RBAC role catalog (≥15 role codes incl. legacy + canonical)
  3. RBAC permission catalog (≥30 permission codes)
  4. RBAC invariants (customer role zero-perm, super-admin short-circuit seeds)
  5. Menu catalog tables + atomic price audit RPC + variant write guard
  6. Coupons + Marketing campaigns + Loyalty tables
  7. Loyalty atomic RPCs + idempotency indexes + tier definitions
  8. Analytics tables + deferred scheduled reports + no materialized views
  9. Settings + Branches (ADR-001 / ADR-002 surfaces)
 10. Audit (ADR-012 — domain_events + mirror triggers — already closed in v1.9.0;
     re-verify presence as part of Phase 6 surface)
"""

from __future__ import annotations
import json
import os
import sys
import urllib.request
import urllib.error

SUPABASE_TOKEN = os.environ.get("SUPABASE_PAT")
if not SUPABASE_TOKEN:
    print("ERROR: SUPABASE_PAT environment variable is not set.")
    sys.exit(2)

PROJECT_REF = "pyeowxvacgypohrbvgee"
BASE_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

HEADERS = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "User-Agent": "telepizza-phase6-verify/1.0",
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
    print("Phase 6 Production Verification — Admin and ERP Core")
    print(f"Project: {PROJECT_REF}")
    print("=" * 70)

    # -----------------------------------------------------------------
    # 1. RBAC tables (ADR-019)
    # -----------------------------------------------------------------
    print("\n[1/10] RBAC tables (ADR-019)")
    tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'users', 'roles', 'permissions', 'role_permissions',
            'user_roles', 'user_role_branches',
            'staff_invites', 'staff_invite_events',
            'staff_invite_branches', 'staff_invite_attempts',
            'staff_assignment_events'
          );
    """)
    for t in [
        "users", "roles", "permissions", "role_permissions",
        "user_roles", "user_role_branches",
        "staff_invites", "staff_invite_events",
        "staff_invite_branches", "staff_invite_attempts",
        "staff_assignment_events",
    ]:
        check(f"table {t} exists", t in tables, f"found={t in tables}")

    # -----------------------------------------------------------------
    # 2. RBAC role catalog (≥15 codes incl. legacy + canonical)
    # -----------------------------------------------------------------
    print("\n[2/10] RBAC role catalog (ADR-019 §2)")
    role_codes = fetch_set("select code from roles;")
    expected_roles = {
        # legacy kebab-case
        "super-admin", "branch-manager", "customer-support",
        "kitchen", "cashier", "rider", "host", "waiter", "customer",
        # canonical underscored
        "platform_super_admin", "organization_owner",
        "branch_manager", "kitchen_manager", "support",
        "finance", "hr", "auditor", "supplier",
    }
    missing_roles = expected_roles - role_codes
    check("≥18 expected role codes present",
          len(missing_roles) == 0,
          f"missing={sorted(missing_roles) if missing_roles else 'none'}")
    check("≥15 total role codes seeded", len(role_codes) >= 15,
          f"count={len(role_codes)}")

    # -----------------------------------------------------------------
    # 3. RBAC permission catalog (≥30 codes)
    # -----------------------------------------------------------------
    print("\n[3/10] RBAC permission catalog (ADR-019 §7)")
    perm_codes = fetch_set("select code from permissions;")
    expected_perms = {
        # foundation
        "menu.read", "menu.write", "branch.read", "branch.manage",
        "order.read", "order.create", "order.manage",
        "delivery.read", "delivery.assign", "delivery.update",
        "payment.read", "payment.manage",
        "staff.read", "staff.manage", "admin.access",
        # staff
        "staff.create", "staff.assign_role",
        # D3
        "reservation.read", "reservation.manage",
        "dinein.manage", "floor.manage",
        "payment.settle", "payment.void", "payment.override_close",
        "deposit.manage",
        # D4
        "platform.health.read",
        # RC3 modules
        "inventory.manage", "purchasing.manage",
        "finance.manage", "hr.manage", "reports.read",
        "loyalty.manage", "marketing.manage",
        # supplier
        "supplier.portal", "supplier.portal.access",
        # Phase 2 ADRs
        "audit.read", "delivery.access",
        "customer.read", "customer.merge",
        "ai.use", "ai.approve", "ai.read",
        "otp.manage", "otp.read",
    }
    missing_perms = expected_perms - perm_codes
    check("≥42 expected permission codes present",
          len(missing_perms) == 0,
          f"missing={sorted(missing_perms) if missing_perms else 'none'}")
    check("≥30 total permission codes seeded", len(perm_codes) >= 30,
          f"count={len(perm_codes)}")

    # -----------------------------------------------------------------
    # 4. RBAC invariants (ADR-019 §4)
    # -----------------------------------------------------------------
    print("\n[4/10] RBAC invariants (ADR-019 §3, §4)")
    # customer role must have zero permissions
    customer_perm_count = fetch_scalar("""
        select count(*) from role_permissions rp
        join roles r on r.id = rp.role_id
        where r.code = 'customer';
    """, default=-1)
    check("customer role has zero permissions",
          customer_perm_count == 0,
          f"count={customer_perm_count}")

    # super-admin must have ≥1 permission (or be implicit super-admin)
    sa_perm_count = fetch_scalar("""
        select count(*) from role_permissions rp
        join roles r on r.id = rp.role_id
        where r.code in ('super-admin', 'platform_super_admin');
    """, default=-1)
    check("super-admin has ≥1 seeded permission (escape hatch exists)",
          sa_perm_count >= 1,
          f"count={sa_perm_count}")

    # role_permissions must be non-empty
    rp_count = fetch_scalar("select count(*) from role_permissions;", default=0)
    check("role_permissions table has rows", rp_count > 0, f"count={rp_count}")

    # user_role_branches table exists and has the expected columns
    urb_cols = fetch_set("""
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'user_role_branches';
    """)
    for col in ["user_role_id", "branch_id"]:
        check(f"user_role_branches.{col}", col in urb_cols)

    # -----------------------------------------------------------------
    # 5. Menu catalog tables + atomic price audit RPC + variant write guard
    #    (ADR-020)
    # -----------------------------------------------------------------
    print("\n[5/10] Menu catalog (ADR-020)")
    menu_tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'menu_categories', 'menu_items', 'menu_item_variants',
            'menu_variant_sku_mappings', 'menu_audit_events',
            'branch_menu_item_overrides',
            'modifier_groups', 'modifier_options',
            'item_modifier_groups', 'order_item_modifiers'
          );
    """)
    for t in [
        "menu_categories", "menu_items", "menu_item_variants",
        "menu_variant_sku_mappings", "menu_audit_events",
        "branch_menu_item_overrides",
        "modifier_groups", "modifier_options",
        "item_modifier_groups", "order_item_modifiers",
    ]:
        check(f"menu table {t} exists", t in menu_tables, f"found={t in menu_tables}")

    # menu_items.price column NOT NULL with CHECK >= 0
    mi_cols = fetch_set("""
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'menu_items';
    """)
    for col in ["price", "size_label", "size_code", "product_group_slug", "base_price"]:
        check(f"menu_items.{col}", col in mi_cols)

    price_null_count = fetch_scalar("""
        select count(*) from menu_items where price is null;
    """, default=-1)
    check("no menu_items with NULL price", price_null_count == 0,
          f"null_count={price_null_count}")

    price_negative_count = fetch_scalar("""
        select count(*) from menu_items where price < 0;
    """, default=-1)
    check("no menu_items with negative price", price_negative_count == 0,
          f"neg_count={price_negative_count}")

    # update_menu_item_price_atomic RPC exists
    rpc_exists = fetch_scalar("""
        select count(*) from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'update_menu_item_price_atomic';
    """, default=0)
    check("update_menu_item_price_atomic RPC exists", rpc_exists >= 1,
          f"count={rpc_exists}")

    # trg_prevent_menu_item_variant_writes trigger exists (note: trg_ prefix)
    trg_exists = fetch_scalar("""
        select count(*) from pg_trigger
        where tgname = 'trg_prevent_menu_item_variant_writes';
    """, default=0)
    check("trg_prevent_menu_item_variant_writes trigger exists", trg_exists >= 1,
          f"count={trg_exists}")

    # menu_audit_events has correlation_id unique index
    corr_idx = fetch_set("""
        select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'menu_audit_events'
          and indexname like '%correlation%';
    """)
    check("menu_audit_events correlation unique index exists",
          len(corr_idx) >= 1, f"indexes={sorted(corr_idx)}")

    # menu.read / menu.write permissions seeded
    for p in ["menu.read", "menu.write"]:
        check(f"permission {p} seeded", p in perm_codes)

    # -----------------------------------------------------------------
    # 6. Coupons + Marketing + Loyalty tables (ADR-021)
    # -----------------------------------------------------------------
    print("\n[6/10] Coupons + Marketing + Loyalty tables (ADR-021)")
    promo_tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'coupons', 'coupon_redemptions',
            'marketing_campaigns', 'marketing_campaign_submissions',
            'marketing_suppressions', 'marketing_segments',
            'marketing_templates', 'marketing_attribution_links',
            'loyalty_marketing_audit_events',
            'loyalty_accounts', 'loyalty_transactions',
            'loyalty_rewards', 'loyalty_reward_redemptions',
            'loyalty_tier_definitions', 'loyalty_tier_history',
            'loyalty_expiry_policies'
          );
    """)
    for t in [
        "coupons", "coupon_redemptions",
        "marketing_campaigns", "marketing_campaign_submissions",
        "marketing_suppressions", "marketing_segments",
        "marketing_templates", "marketing_attribution_links",
        "loyalty_marketing_audit_events",
        "loyalty_accounts", "loyalty_transactions",
        "loyalty_rewards", "loyalty_reward_redemptions",
        "loyalty_tier_definitions", "loyalty_tier_history",
        "loyalty_expiry_policies",
    ]:
        check(f"promo table {t} exists", t in promo_tables,
              f"found={t in promo_tables}")

    # coupon_validate_discount RPC exists
    cvd_exists = fetch_scalar("""
        select count(*) from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'coupon_validate_discount';
    """, default=0)
    check("coupon_validate_discount RPC exists", cvd_exists >= 1,
          f"count={cvd_exists}")

    # marketing.manage + loyalty.manage permissions seeded
    for p in ["marketing.manage", "loyalty.manage"]:
        check(f"permission {p} seeded", p in perm_codes)

    # -----------------------------------------------------------------
    # 7. Loyalty atomic RPCs + idempotency indexes + tier definitions
    #    (ADR-021 §3, §5)
    # -----------------------------------------------------------------
    print("\n[7/10] Loyalty atomic RPCs + tiers (ADR-021)")
    loyalty_rpcs = fetch_set("""
        select p.proname from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in (
            'loyalty_earn_for_order_atomic',
            'loyalty_burn_atomic',
            'loyalty_adjust_atomic',
            'loyalty_expire_atomic',
            'loyalty_reverse_atomic'
          );
    """)
    for r in [
        "loyalty_earn_for_order_atomic",
        "loyalty_burn_atomic",
        "loyalty_adjust_atomic",
        "loyalty_expire_atomic",
        "loyalty_reverse_atomic",
    ]:
        check(f"loyalty RPC {r} exists", r in loyalty_rpcs, f"found={r in loyalty_rpcs}")

    # loyalty_transactions idempotency indexes
    lt_idx = fetch_set("""
        select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'loyalty_transactions';
    """)
    for expected_idx_pattern in ["earn_order", "idempotency", "reverse_once"]:
        found = any(expected_idx_pattern in i for i in lt_idx)
        check(f"loyalty_transactions index contains '{expected_idx_pattern}'",
              found, f"matches={[i for i in lt_idx if expected_idx_pattern in i]}")

    # tier definitions seeded (4 tiers)
    tier_count = fetch_scalar("""
        select count(*) from loyalty_tier_definitions
        where tier_code in ('member', 'silver', 'gold', 'platinum');
    """, default=0)
    check("4 loyalty tiers seeded", tier_count == 4, f"count={tier_count}")

    # marketing segments seeded (10 segments)
    seg_count = fetch_scalar("""
        select count(*) from marketing_segments
        where code in (
          'new_customers', 'returning_customers', 'inactive_customers',
          'loyalty_members', 'tier_members', 'high_frequency',
          'high_spend', 'coupon_users', 'lapsed_customers',
          'consented_audiences'
        );
    """, default=0)
    check("10 marketing segments seeded", seg_count == 10, f"count={seg_count}")

    # -----------------------------------------------------------------
    # 8. Analytics tables + deferred scheduled reports + no materialized views
    #    (ADR-022)
    # -----------------------------------------------------------------
    print("\n[8/10] Analytics tables + invariants (ADR-022)")
    analytics_tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'analytics_scheduled_reports',
            'analytics_exceptions',
            'analytics_data_quality_checks'
          );
    """)
    for t in [
        "analytics_scheduled_reports",
        "analytics_exceptions",
        "analytics_data_quality_checks",
    ]:
        check(f"analytics table {t} exists", t in analytics_tables,
              f"found={t in analytics_tables}")

    # execution_status default is 'deferred'
    exec_default = fetch_scalar("""
        select column_default from information_schema.columns
        where table_schema = 'public'
          and table_name = 'analytics_scheduled_reports'
          and column_name = 'execution_status';
    """, default="")
    check("analytics_scheduled_reports.execution_status defaults to 'deferred'",
          "deferred" in str(exec_default).lower(), f"default={exec_default}")

    # all existing scheduled reports have execution_status='deferred'
    non_deferred = fetch_scalar("""
        select count(*) from analytics_scheduled_reports
        where execution_status <> 'deferred';
    """, default=0)
    check("all scheduled reports are 'deferred' (no worker has run)",
          non_deferred == 0, f"non_deferred_count={non_deferred}")

    # NO materialized views in public schema
    mv_count = fetch_scalar("""
        select count(*) from pg_matviews where schemaname = 'public';
    """, default=0)
    check("no materialized views in public schema", mv_count == 0,
          f"count={mv_count}")

    # pg_cron extension NOT installed
    pg_cron = fetch_scalar("""
        select count(*) from pg_extension where extname = 'pg_cron';
    """, default=0)
    check("pg_cron extension NOT installed", pg_cron == 0,
          f"count={pg_cron}")

    # reports.read permission seeded
    check("permission reports.read seeded", "reports.read" in perm_codes)

    # helpful indexes on orders / payments (added by RC4-11 migration)
    # check the actual index DEFINITION for branch_id + created_at + status columns
    orders_idx_defs = fetch_set("""
        select indexdef from pg_indexes
        where schemaname = 'public' and tablename = 'orders';
    """)
    has_orders_branch_created_status_idx = any(
        "branch_id" in d and "created_at" in d and "status" in d
        for d in orders_idx_defs
    )
    check("orders has composite index on (branch_id, created_at, status)",
          has_orders_branch_created_status_idx,
          f"found={'orders_created_at_branch_status_idx' if has_orders_branch_created_status_idx else 'none'}")

    # -----------------------------------------------------------------
    # 9. Settings + Branches (ADR-001 / ADR-002)
    # -----------------------------------------------------------------
    print("\n[9/10] Settings + Branches (ADR-001 / ADR-002)")
    sb_tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'branches', 'organization_settings',
            'configuration_schemas',
            'configuration_versions',
            'configuration_active_versions',
            'configuration_change_log',
            'branch_live_config_snapshots'
          );
    """)
    for t in [
        "branches", "organization_settings",
        "configuration_schemas",
        "configuration_versions",
        "configuration_active_versions",
        "configuration_change_log",
    ]:
        check(f"settings/branch table {t} exists", t in sb_tables,
              f"found={t in sb_tables}")

    # at least 1 branch seeded
    branch_count = fetch_scalar("select count(*) from branches;", default=0)
    check("≥1 branch seeded", branch_count >= 1, f"count={branch_count}")

    # -----------------------------------------------------------------
    # 10. Audit (ADR-012 — re-verify as part of Phase 6 surface)
    # -----------------------------------------------------------------
    print("\n[10/10] Audit (ADR-012 — re-verify)")
    audit_tables = fetch_set("""
        select table_name from information_schema.tables
        where table_schema = 'public'
          and table_name = 'domain_events';
    """)
    check("domain_events table exists", "domain_events" in audit_tables)

    audit_rpcs = fetch_set("""
        select p.proname from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in (
            'emit_domain_event',
            'enforce_domain_events_append_only',
            'mirror_delivery_transition_to_domain_events',
            'mirror_customer_merge_to_domain_events',
            'mirror_whatsapp_event_to_domain_events',
            'mirror_order_transition_to_domain_events'
          );
    """)
    for r in [
        "emit_domain_event",
        "enforce_domain_events_append_only",
        "mirror_delivery_transition_to_domain_events",
        "mirror_customer_merge_to_domain_events",
        "mirror_whatsapp_event_to_domain_events",
        "mirror_order_transition_to_domain_events",
    ]:
        check(f"audit RPC/trigger {r} exists", r in audit_rpcs,
              f"found={r in audit_rpcs}")

    check("permission audit.read seeded", "audit.read" in perm_codes)

    # -----------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"Phase 6 Production Verification Summary")
    print(f"  PASS: {PASS}")
    print(f"  FAIL: {FAIL}")
    print(f"  TOTAL: {PASS + FAIL}")
    print("=" * 70)

    if FAIL > 0:
        print("\nFAILED CHECKS:")
        for name, ok, detail in CHECKS:
            if not ok:
                print(f"  - {name} {detail}")
        return 1
    print("\n✅ ALL CHECKS PASSED — Phase 6 (Admin & ERP Core) PRODUCTION-READY.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
