#!/usr/bin/env python3
"""
Verify all Phase 2 migrations are applied to Production Supabase.
Checks for the existence of all critical tables, functions, and columns
introduced by ADR-001 through ADR-015.
"""
import os
import sys
import json
import urllib.request
import urllib.error

SUPABASE_TOKEN = os.environ.get("SUPABASE_PAT")
PROJECT_REF = "pyeowxvacgypohrbvgee"

if not SUPABASE_TOKEN:
    print("ERROR: SUPABASE_PAT env var not set", file=sys.stderr)
    sys.exit(1)

def run_query(sql: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {SUPABASE_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "telepizza-verify/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        status = e.code
        raw = e.read().decode("utf-8")
    # Supabase returns 201 Created for successful query execution
    if status not in (200, 201):
        raise RuntimeError(f"HTTP {status}: {raw}")
    data = json.loads(raw)
    return data


def table_exists(table_name: str) -> bool:
    sql = f"SELECT to_regclass('public.{table_name}') AS oid;"
    data = run_query(sql)
    return bool(data and data[0].get("oid"))


def function_exists(func_name: str) -> bool:
    sql = (
        "SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid "
        f"WHERE n.nspname = 'public' AND p.proname = '{func_name}' LIMIT 1;"
    )
    data = run_query(sql)
    return bool(data)


def column_exists(table: str, column: str) -> bool:
    sql = (
        f"SELECT column_name FROM information_schema.columns "
        f"WHERE table_schema = 'public' AND table_name = '{table}' "
        f"AND column_name = '{column}' LIMIT 1;"
    )
    data = run_query(sql)
    return bool(data)


def permission_exists(perm: str) -> bool:
    sql = f"SELECT code FROM public.permissions WHERE code = '{perm}';"
    data = run_query(sql)
    return bool(data)


# Define expectations by phase
PHASES = [
    {
        "phase": "2.1 (ADR-001/002 Settings)",
        "tables": ["configuration_schemas", "configuration_versions", "configuration_change_log"],
        "functions": [],
        "permissions": [],
    },
    {
        "phase": "2.2 (ADR-003/004 WhatsApp Foundation)",
        "tables": [
            "whatsapp_provider_configs",
            "whatsapp_conversations",
            "whatsapp_messages",
            "whatsapp_inbound_events",
            "whatsapp_conversation_events",
            "whatsapp_message_templates",
        ],
        "functions": ["whatsapp_anonymize_pii"],
        "permissions": [],
    },
    {
        "phase": "2.3 (ADR-005/006 CRM)",
        "tables": [
            "customer_identities",
            "customer_merge_log",
            "customer_identity_backfill_conflicts",
        ],
        "functions": [
            "normalize_phone_e164",
            "resolve_customer_by_identity",
            "merge_customers_atomic",
            "reverse_customer_merge",
        ],
        "permissions": ["customer.read", "customer.merge"],
    },
    {
        "phase": "2.4 (ADR-008/009/010 Delivery & Rider)",
        "tables": ["rider_locations", "delivery_pod", "cod_collections"],
        "functions": [
            "purge_expired_rider_locations",
            "enforce_delivery_pod_immutability",
            "post_cod_collection_journal",
        ],
        "permissions": ["delivery.access"],
    },
    {
        "phase": "2.5 (ADR-012 Audit)",
        "tables": ["domain_events"],
        "functions": [
            "emit_domain_event",
            "enforce_domain_events_append_only",
            "mirror_delivery_transition_to_domain_events",
            "mirror_customer_merge_to_domain_events",
            "mirror_whatsapp_event_to_domain_events",
            "mirror_order_transition_to_domain_events",
        ],
        "permissions": ["audit.read"],
    },
    {
        "phase": "2.6 (ADR-013/014/015 AI)",
        "tables": [
            "ai_provider_configs",
            "ai_call_logs",
            "ai_action_approvals",
            "ai_prompt_logs",
        ],
        "functions": ["upsert_ai_prompt_log"],
        "permissions": ["ai.use", "ai.approve"],
    },
]


def main():
    print("=" * 70)
    print("PHASE 2 PRODUCTION VERIFICATION — Supabase project", PROJECT_REF)
    print("=" * 70)

    all_ok = True
    for phase in PHASES:
        print(f"\n--- {phase['phase']} ---")
        for t in phase["tables"]:
            ok = table_exists(t)
            mark = "OK" if ok else "MISSING"
            print(f"  table  {t:40} {mark}")
            if not ok:
                all_ok = False
        for f in phase["functions"]:
            ok = function_exists(f)
            mark = "OK" if ok else "MISSING"
            print(f"  func   {f:40} {mark}")
            if not ok:
                all_ok = False
        for p in phase["permissions"]:
            ok = permission_exists(p)
            mark = "OK" if ok else "MISSING"
            print(f"  perm   {p:40} {mark}")
            if not ok:
                all_ok = False

    print("\n" + "=" * 70)
    if all_ok:
        print("RESULT: ALL PHASE 2 OBJECTS PRESENT IN PRODUCTION")
    else:
        print("RESULT: SOME OBJECTS MISSING — see above")
    print("=" * 70)
    sys.exit(0 if all_ok else 2)


if __name__ == "__main__":
    main()
