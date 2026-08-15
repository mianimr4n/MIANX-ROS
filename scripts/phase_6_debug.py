#!/usr/bin/env python3
"""Investigate Phase 6 verification failures."""
from __future__ import annotations
import json
import os
import urllib.request

TOKEN = os.environ["SUPABASE_PAT"]
URL = "https://api.supabase.com/v1/projects/pyeowxvacgypohrbvgee/database/query"


def run_sql(sql: str):
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        URL, data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "telepizza-phase6-debug/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return [{"_error": str(e)}]


# 1. All triggers on menu_item_variants
print("=== Triggers on menu_item_variants ===")
print(json.dumps(run_sql(
    "select tgname from pg_trigger where tgrelid = 'public.menu_item_variants'::regclass;"
), indent=2))

# 2. All settings/config tables
print()
print("=== Tables matching config/setting/version ===")
print(json.dumps(run_sql(
    "select table_name from information_schema.tables where table_schema='public' "
    "and (table_name like '%config%' or table_name like '%setting%' or table_name like '%version%') "
    "order by table_name;"
), indent=2))

# 3. Indexes on orders (full definitions)
print()
print("=== Indexes on orders (full definitions) ===")
print(json.dumps(run_sql(
    "select indexname, indexdef from pg_indexes where schemaname='public' and tablename='orders';"
), indent=2))

# 4. domain_events table
print()
print("=== domain_events existence ===")
print(json.dumps(run_sql(
    "select table_name from information_schema.tables where table_schema='public' and table_name = 'domain_events';"
), indent=2))
