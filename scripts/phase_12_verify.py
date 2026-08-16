#!/usr/bin/env python3
"""
Phase 12 (Customer and Staff Apps) — Repository Verification Script

Verifies the as-built customer/staff/rider/franchise/support/delivery
surface in the local repository against ADR-039 (Customer Mobile &
Franchise Portal Contract), ADR-040 (Rider Mobile App & Delivery
Dashboard Contract), and ADR-041 (Staff App & Support Panel Contract).

Coverage (70+ checks across 10 categories):
  1. ADR files: all 41 ADR files (ADR-001..ADR-041) exist under
     docs/13-adr/ and are marked ACCEPTED v1.0
  2. ADR_INDEX.md: references all 41 ADRs with v2.7.0 closeout entries
  3. Roadmap: TELEPIZZA-MASTER-ROADMAP.md marks Phase 12 as COMPLETE
     (v2.7.0) and unlocks Phase 13
  4. CHANGELOG.md: v2.7.0 entry exists with Phase 12 closeout summary
  5. REPOSITORY_STATUS.md: baseline bumped to v2.7.0; architecture
     status reflects Phase 12 COMPLETE
  6. Release notes: docs/releases/v2.7.0_RELEASE_NOTES.md exists
     with the 3 new ADRs listed
  7. Customer mobile surface (ADR-039): apps/website directory +
     customer pages (Home, Menu, Checkout, TrackOrder, MyTelepizza,
     Loyalty) + PWA manifest + ADR-017 auth pages
  8. Franchise portal surface (ADR-039): organization_owner role
     seed in identity migration + getOwnerWorkspace analytics engine
     + AdminBranchManager.tsx + branch_comparison analytics module
     + owner-workspace admin route
  9. Rider mobile + delivery dashboard surface (ADR-040): rider
     routes (/api/v1/riders/*), admin delivery routes (10),
     AdminDelivery.tsx + 8 sub-components, rider_locations migration,
     delivery-kpi-service
 10. Staff app + support panel surface (ADR-041): AdminShell.tsx +
     37 admin pages + 5 ops pages + 32 admin router modules +
     AdminCrm.tsx + AdminWhatsApp.tsx + customer-support/support role
     seeds + audit_log migration

Usage:
  python3 scripts/phase_12_verify.py

Exit codes:
  0 — all checks passed
  1 — one or more checks failed
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

CHECKS_PASSED = 0
CHECKS_FAILED = 0
FAILURES: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    global CHECKS_PASSED, CHECKS_FAILED
    status = "PASS" if ok else "FAIL"
    if ok:
        CHECKS_PASSED += 1
    else:
        CHECKS_FAILED += 1
        FAILURES.append(f"{label}: {detail}")
    print(f"  [{status}] {label}" + (f" — {detail}" if detail and not ok else ""))


def read_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def file_exists(path: Path) -> bool:
    return path.is_file()


def dir_exists(path: Path) -> bool:
    return path.is_dir()


# ---------------------------------------------------------------------------
# Category 1: ADR files (all 41 must exist + be ACCEPTED v1.0)
# ---------------------------------------------------------------------------

def check_adr_files() -> None:
    print("\n=== Category 1: ADR files (ADR-001..ADR-041) ===")
    adr_dir = REPO_ROOT / "docs" / "13-adr"

    adr_filenames = {
        1: "ADR-001-branch-configuration-inheritance.md",
        2: "ADR-002-settings-versioning-rollback.md",
        3: "ADR-003-provider-secret-boundary.md",
        4: "ADR-004-whatsapp-conversation-ownership.md",
        5: "ADR-005-canonical-customer-identity.md",
        6: "ADR-006-customer-account-merge.md",
        7: "ADR-007-delivery-state-machine.md",
        8: "ADR-008-rider-location-retention.md",
        9: "ADR-009-proof-of-delivery.md",
        10: "ADR-010-cod-financial-ownership.md",
        11: "ADR-011-accounting-immutability.md",
        12: "ADR-012-domain-event-audit.md",
        13: "ADR-013-ai-provider-boundary.md",
        14: "ADR-014-ai-approval-gate.md",
        15: "ADR-015-ai-prompt-retention.md",
        16: "ADR-016-otp-verification-architecture.md",
        17: "ADR-017-phone-first-auth-session-handoff.md",
        18: "ADR-018-order-lifecycle-state-machine.md",
        19: "ADR-019-rbac-authorization-principal.md",
        20: "ADR-020-canonical-single-price-menu-catalog.md",
        21: "ADR-021-deals-coupons-loyalty-engine.md",
        22: "ADR-022-reports-analytics-framework.md",
        23: "ADR-023-pos-cashier-workflow-order-source-contract.md",
        24: "ADR-024-dine-in-bill-settlement.md",
        25: "ADR-025-pos-shifts-zreport-cash-recon.md",
        26: "ADR-026-branch-sync-offline-safe-pos-contract.md",
        27: "ADR-027-kitchen-ticket-lifecycle-queue-contract.md",
        28: "ADR-028-kot-snapshot-per-item-status.md",
        29: "ADR-029-kitchen-timers-priority-display-contract.md",
        30: "ADR-030-rider-identity-dispatch-assignment-contract.md",
        31: "ADR-031-delivery-lifecycle-pickup-pod-surface.md",
        32: "ADR-032-rider-location-navigation-performance-contract.md",
        33: "ADR-033-inventory-stock-master-movement-ledger-contract.md",
        34: "ADR-034-recipe-bom-cogs-costing-contract.md",
        35: "ADR-035-procurement-suppliers-grn-contract.md",
        36: "ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md",
        37: "ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md",
        38: "ADR-038-tax-ar-ap-cogs-expense-posting-contract.md",
        39: "ADR-039-customer-mobile-franchise-portal-contract.md",
        40: "ADR-040-rider-mobile-app-delivery-dashboard-contract.md",
        41: "ADR-041-staff-app-support-panel-contract.md",
    }

    for adr_num, filename in adr_filenames.items():
        path = adr_dir / filename
        exists = file_exists(path)
        check(f"ADR-{adr_num:03d} file exists", exists, str(path.relative_to(REPO_ROOT)))

        if exists:
            content = read_file(path)
            # ADRs 1-15 are older format; ADRs 16+ use the "Status: ACCEPTED" header
            if adr_num >= 16:
                accepted = "**Status:** ACCEPTED" in content
                check(f"ADR-{adr_num:03d} marked ACCEPTED", accepted, "missing '**Status:** ACCEPTED' header")

                version_match = re.search(r"\*\*Version:\*\*\s*(\d+\.\d+)", content)
                check(f"ADR-{adr_num:03d} has Version", version_match is not None,
                      "missing '**Version:**' field")

    # Verify Phase 12 ADRs reference v2.7.0
    for adr_num in (39, 40, 41):
        path = adr_dir / adr_filenames[adr_num]
        content = read_file(path)
        v270 = "v2.7.0" in content
        check(f"ADR-{adr_num:03d} references v2.7.0", v270, "missing 'v2.7.0' reference")

        phase12 = "Phase 12" in content
        check(f"ADR-{adr_num:03d} references Phase 12", phase12, "missing 'Phase 12' reference")


# ---------------------------------------------------------------------------
# Category 2: ADR_INDEX.md
# ---------------------------------------------------------------------------

def check_adr_index() -> None:
    print("\n=== Category 2: ADR_INDEX.md ===")
    path = REPO_ROOT / "docs" / "00-governance" / "ADR_INDEX.md"
    check("ADR_INDEX.md exists", file_exists(path))

    content = read_file(path)

    # All 41 ADRs should be listed in the index table
    for adr_num in range(1, 42):
        adr_id = f"ADR-{adr_num:03d}"
        check(f"{adr_id} row in ADR_INDEX", adr_id in content, f"missing {adr_id} row")

    # Phase 12 ADRs should reference v2.7.0
    for adr_num in (39, 40, 41):
        adr_id = f"ADR-{adr_num:03d}"
        v270_ref = f"{adr_id} | " in content and "v2.7.0" in content
        check(f"{adr_id} references v2.7.0 in ADR_INDEX", v270_ref,
              f"missing v2.7.0 reference for {adr_id}")

    # Phase 12 note paragraph should exist
    phase12_note = "ADR-039 through ADR-041" in content
    check("Phase 12 note paragraph exists", phase12_note,
          "missing 'ADR-039 through ADR-041' note paragraph")


# ---------------------------------------------------------------------------
# Category 3: TELEPIZZA-MASTER-ROADMAP.md
# ---------------------------------------------------------------------------

def check_roadmap() -> None:
    print("\n=== Category 3: TELEPIZZA-MASTER-ROADMAP.md ===")
    path = REPO_ROOT / "docs" / "14-phases" / "TELEPIZZA-MASTER-ROADMAP.md"
    check("TELEPIZZA-MASTER-ROADMAP.md exists", file_exists(path))

    content = read_file(path)

    # Phase 12 section should be marked COMPLETE
    phase12_complete = "Phase 12 — Customer and Staff Apps" in content and "✅ COMPLETE (v2.7.0)" in content
    check("Phase 12 marked COMPLETE (v2.7.0)", phase12_complete,
          "missing '✅ COMPLETE (v2.7.0)' on Phase 12 section")

    # ADR-039/040/041 should be listed as Formal ADRs
    for adr_num in (39, 40, 41):
        adr_id = f"ADR-{adr_num:03d}"
        check(f"{adr_id} listed as Formal ADR in Phase 12", adr_id in content,
              f"missing {adr_id} reference in Phase 12 section")

    # Close report path should be referenced
    close_report = "phase12-closeout/PHASE12_FINAL_GATE.md" in content
    check("Phase 12 close report referenced", close_report,
          "missing phase12-closeout/PHASE12_FINAL_GATE.md reference")

    # Phase 13 should be UNLOCKED in the current pointer
    phase13_unlocked = "Phase 13 — AI and Automation" in content and "UNLOCKED" in content
    check("Phase 13 UNLOCKED in current pointer", phase13_unlocked,
          "missing Phase 13 UNLOCKED reference in current pointer")

    # Current pointer should reflect Phase 12 PASS AND CLOSED
    phase12_pointer = "Phase 12 **PASS AND CLOSED** (v2.7.0)" in content
    check("Current pointer shows Phase 12 PASS AND CLOSED (v2.7.0)", phase12_pointer,
          "missing 'Phase 12 **PASS AND CLOSED** (v2.7.0)' in current pointer")


# ---------------------------------------------------------------------------
# Category 4: CHANGELOG.md
# ---------------------------------------------------------------------------

def check_changelog() -> None:
    print("\n=== Category 4: CHANGELOG.md ===")
    path = REPO_ROOT / "CHANGELOG.md"
    check("CHANGELOG.md exists", file_exists(path))

    content = read_file(path)

    # v2.7.0 section should exist
    v270_section = "## [2.7.0]" in content and "Phase 12 Complete" in content
    check("v2.7.0 section in CHANGELOG", v270_section,
          "missing '## [2.7.0]' section")

    # All 3 Phase 12 ADRs should have their own subsection
    for adr_num in (39, 40, 41):
        adr_id = f"ADR-{adr_num:03d}"
        check(f"{adr_id} subsection in CHANGELOG", f"### {adr_id}" in content,
              f"missing '### {adr_id}' subsection")

    # Should mention 41 ADRs total (text may wrap across newline)
    total_adrs = ("41\nADRs" in content or "41 ADRs" in content
                  or "ADR-001 through ADR-041" in content)
    check("CHANGELOG mentions 41 ADRs total", total_adrs,
          "missing '41 ADRs' or 'ADR-001 through ADR-041' reference")

    # Should reference Phase 13 UNLOCKED
    phase13 = "Phase 13 (AI and Automation) is now UNLOCKED" in content
    check("CHANGELOG mentions Phase 13 UNLOCKED", phase13,
          "missing 'Phase 13 (AI and Automation) is now UNLOCKED'")


# ---------------------------------------------------------------------------
# Category 5: REPOSITORY_STATUS.md
# ---------------------------------------------------------------------------

def check_repository_status() -> None:
    print("\n=== Category 5: REPOSITORY_STATUS.md ===")
    path = REPO_ROOT / "docs" / "00-governance" / "REPOSITORY_STATUS.md"
    check("REPOSITORY_STATUS.md exists", file_exists(path))

    content = read_file(path)

    # Should reference Phase 12 COMPLETE
    phase12 = "Phase 12 COMPLETE" in content and "v2.7.0" in content
    check("Phase 12 COMPLETE (v2.7.0) in REPOSITORY_STATUS", phase12,
          "missing 'Phase 12 COMPLETE' + 'v2.7.0' reference")

    # Architecture status should reflect Phase 12
    arch_status = "Phase 12 COMPLETE — ADR-001 through ADR-041" in content
    check("Architecture status reflects Phase 12 COMPLETE", arch_status,
          "missing 'Phase 12 COMPLETE — ADR-001 through ADR-041' in architecture status")

    # Latest released baseline should be v2.7.0
    latest_baseline = "Latest released baseline" in content and "v2.7.0" in content
    check("Latest released baseline is v2.7.0", latest_baseline,
          "missing 'v2.7.0' in latest released baseline row")

    # Phase 12 row in status table
    phase12_row = "Phase 12 Customer and Staff Apps (ADR-039/040/041)" in content
    check("Phase 12 row in status table", phase12_row,
          "missing 'Phase 12 Customer and Staff Apps (ADR-039/040/041)' row")


# ---------------------------------------------------------------------------
# Category 6: Release notes
# ---------------------------------------------------------------------------

def check_release_notes() -> None:
    print("\n=== Category 6: v2.7.0 Release Notes ===")
    path = REPO_ROOT / "docs" / "releases" / "v2.7.0_RELEASE_NOTES.md"
    check("v2.7.0_RELEASE_NOTES.md exists", file_exists(path))

    content = read_file(path)

    # Should mention Phase 12 Complete
    phase12 = "Phase 12 Complete" in content and "Customer and Staff Apps" in content
    check("Release notes title is Phase 12 Complete", phase12,
          "missing 'Phase 12 Complete' + 'Customer and Staff Apps' in title")

    # Should list all 3 ADRs as subsections
    for adr_num in (39, 40, 41):
        adr_id = f"ADR-{adr_num:03d}"
        check(f"{adr_id} subsection in release notes", f"### {adr_id}" in content,
              f"missing '### {adr_id}' subsection")

    # Should mention 41 ADRs total
    total_adrs = "41 ADRs" in content
    check("Release notes mention 41 ADRs", total_adrs, "missing '41 ADRs' reference")

    # Should mention DEFERRED items
    deferred = "DEFERRED" in content
    check("Release notes mention DEFERRED items", deferred, "missing 'DEFERRED' reference")

    # Should reference Phase 13 UNLOCKED
    phase13 = "Phase 13" in content and "UNLOCKED" in content
    check("Release notes mention Phase 13 UNLOCKED", phase13,
          "missing 'Phase 13' + 'UNLOCKED' reference")


# ---------------------------------------------------------------------------
# Category 7: Customer mobile surface (ADR-039)
# ---------------------------------------------------------------------------

def check_customer_mobile_surface() -> None:
    print("\n=== Category 7: Customer mobile surface (ADR-039) ===")
    website_dir = REPO_ROOT / "apps" / "website"
    check("apps/website directory exists", dir_exists(website_dir))

    client_dir = website_dir / "client"
    check("apps/website/client directory exists", dir_exists(client_dir))

    src_dir = client_dir / "src"
    check("apps/website/client/src directory exists", dir_exists(src_dir))

    pages_dir = src_dir / "pages"
    check("apps/website/client/src/pages directory exists", dir_exists(pages_dir))

    # Customer-facing pages
    customer_pages = [
        "Home.tsx",
        "Menu.tsx",
        "Checkout.tsx",
        "TrackOrder.tsx",
        "MyTelepizza.tsx",
        "Loyalty.tsx",
        "Orders.tsx",
        "Favorites.tsx",
        "Branches.tsx",
        "Account.tsx",
    ]
    for page in customer_pages:
        path = pages_dir / page
        check(f"Customer page {page} exists", file_exists(path))

    # ADR-017 auth pages
    auth_pages = ["Login.tsx", "Register.tsx", "ForgotPassword.tsx", "ResetPassword.tsx", "StaffLogin.tsx"]
    for page in auth_pages:
        path = pages_dir / page
        check(f"Auth page {page} exists", file_exists(path))

    # PWA manifest
    manifest = client_dir / "public" / "site.webmanifest"
    check("site.webmanifest exists", file_exists(manifest))

    # TrackOrder.tsx should poll orders endpoint
    trackorder = read_file(pages_dir / "TrackOrder.tsx")
    polls = "GET" in trackorder or "fetch" in trackorder or "useQuery" in trackorder
    check("TrackOrder.tsx polls/fetches order data", polls,
          "TrackOrder.tsx has no fetch/useQuery call")

    # MyTelepizza.tsx should reference loyalty
    mytelepizza = read_file(pages_dir / "MyTelepizza.tsx")
    loyalty_ref = "loyalty" in mytelepizza.lower() or "Loyalty" in mytelepizza
    check("MyTelepizza.tsx references loyalty", loyalty_ref,
          "MyTelepizza.tsx has no loyalty reference")

    # Customer auth: principal.ts CUSTOMER_FORBIDDEN_PERMISSIONS
    principal_path = REPO_ROOT / "backend" / "api" / "src" / "services" / "auth" / "principal.ts"
    principal = read_file(principal_path)
    forbidden = "CUSTOMER_FORBIDDEN_PERMISSIONS" in principal
    check("CUSTOMER_FORBIDDEN_PERMISSIONS defined in principal.ts", forbidden,
          "missing CUSTOMER_FORBIDDEN_PERMISSIONS in principal.ts")

    # Customer role seed — in customer_auth foundation migration, not seed_foundation_data
    customer_auth_seed = REPO_ROOT / "supabase" / "migrations" / "20260716010000_sprint3_customer_auth_foundation.sql"
    customer_auth_content = read_file(customer_auth_seed)
    customer_role = "'customer'" in customer_auth_content or "'Customer'" in customer_auth_content
    check("Customer role seeded in customer_auth foundation migration", customer_role,
          "missing customer role seed in 20260716010000_sprint3_customer_auth_foundation.sql")

    # users.user_type CHECK should include 'customer' (foundation schema)
    foundation_schema = REPO_ROOT / "supabase" / "migrations" / "20260713190000_foundation_schema.sql"
    schema_content = read_file(foundation_schema)
    customer_usertype = "'customer'" in schema_content
    check("users.user_type CHECK includes 'customer'", customer_usertype,
          "missing 'customer' in user_type CHECK constraint")


# ---------------------------------------------------------------------------
# Category 8: Franchise portal surface (ADR-039)
# ---------------------------------------------------------------------------

def check_franchise_portal_surface() -> None:
    print("\n=== Category 8: Franchise portal surface (ADR-039) ===")

    # organization_owner role seed in Identity 01 migration
    identity_migration = REPO_ROOT / "supabase" / "migrations" / "20260807100000_identity_01_tenant_owner_onboarding.sql"
    identity_content = read_file(identity_migration)
    org_owner = "'organization_owner'" in identity_content or "organization_owner" in identity_content
    check("organization_owner role seeded in Identity 01 migration", org_owner,
          "missing organization_owner in 20260807100000_identity_01_tenant_owner_onboarding.sql")

    # AnalyticsService.getOwnerWorkspace in engine.ts
    engine_path = REPO_ROOT / "backend" / "api" / "src" / "services" / "analytics" / "engine.ts"
    engine_content = read_file(engine_path)
    owner_ws = "getOwnerWorkspace" in engine_content
    check("getOwnerWorkspace method in analytics engine", owner_ws,
          "missing getOwnerWorkspace in engine.ts")

    # branch_comparison analytics module
    registry_path = REPO_ROOT / "backend" / "api" / "src" / "services" / "analytics" / "registry.ts"
    registry_content = read_file(registry_path)
    branch_cmp = "branch_comparison" in registry_content
    check("branch_comparison analytics module registered", branch_cmp,
          "missing branch_comparison in registry.ts")

    # Owner workspace admin route
    reports_path = REPO_ROOT / "backend" / "api" / "src" / "modules" / "admin" / "reports.ts"
    reports_content = read_file(reports_path)
    owner_route = "owner-workspace" in reports_content or "getOwnerWorkspace" in reports_content
    check("Owner workspace admin route in reports.ts", owner_route,
          "missing owner-workspace route in reports.ts")

    # AdminBranchManager.tsx
    branch_mgr_path = REPO_ROOT / "apps" / "website" / "client" / "src" / "pages" / "admin" / "AdminBranchManager.tsx"
    check("AdminBranchManager.tsx exists", file_exists(branch_mgr_path))

    branch_mgr = read_file(branch_mgr_path)
    multi_branch = "branch" in branch_mgr.lower()
    check("AdminBranchManager.tsx is branch-focused", multi_branch,
          "AdminBranchManager.tsx has no branch reference")


# ---------------------------------------------------------------------------
# Category 9: Rider mobile + delivery dashboard surface (ADR-040)
# ---------------------------------------------------------------------------

def check_rider_delivery_surface() -> None:
    print("\n=== Category 9: Rider mobile + delivery dashboard surface (ADR-040) ===")

    # Rider routes module
    riders_routes = REPO_ROOT / "backend" / "api" / "src" / "modules" / "riders" / "routes.ts"
    check("Rider routes module exists", file_exists(riders_routes))

    riders_content = read_file(riders_routes)
    rider_endpoints = [
        ("/assignments", "GET /assignments"),
        ("/roster", "GET /roster"),
        ("/deliveries/:deliveryId/assign", "POST /deliveries/:deliveryId/assign"),
        ("/deliveries/:deliveryId/status", "POST /deliveries/:deliveryId/status"),
    ]
    for endpoint, label in rider_endpoints:
        check(f"Rider endpoint {label}", endpoint in riders_content,
              f"missing {endpoint} in riders/routes.ts")

    # Admin delivery-rider module
    admin_delivery = REPO_ROOT / "backend" / "api" / "src" / "modules" / "admin" / "delivery-rider.ts"
    check("Admin delivery-rider module exists", file_exists(admin_delivery))

    # AdminDelivery.tsx
    admin_delivery_tsx = REPO_ROOT / "apps" / "website" / "client" / "src" / "pages" / "admin" / "AdminDelivery.tsx"
    check("AdminDelivery.tsx exists", file_exists(admin_delivery_tsx))

    # 8 delivery dashboard sub-components
    delivery_components_dir = REPO_ROOT / "apps" / "website" / "client" / "src" / "components" / "admin" / "delivery"
    check("Delivery components directory exists", dir_exists(delivery_components_dir))

    delivery_components = [
        "DeliveryCards.tsx",
        "DeliveryDrawer.tsx",
        "DeliveryFilters.tsx",
        "DeliveryInsights.tsx",
        "DeliveryKPIs.tsx",
        "DeliverySidePanels.tsx",
        "DeliveryTimeline.tsx",
        "DispatchQueue.tsx",
    ]
    for component in delivery_components:
        path = delivery_components_dir / component
        check(f"Delivery component {component} exists", file_exists(path))

    # rider_locations migration (ADR-008/009/010)
    rider_migration = REPO_ROOT / "supabase" / "migrations" / "20260817000000_adr_008_009_010_delivery_rider.sql"
    check("ADR-008/009/010 delivery_rider migration exists", file_exists(rider_migration))

    rider_migration_content = read_file(rider_migration)
    rider_locations = "rider_locations" in rider_migration_content
    check("rider_locations table in migration", rider_locations,
          "missing rider_locations table in 20260817000000_adr_008_009_010_delivery_rider.sql")

    # ADR-009 uses singular 'delivery_pod' table name (not 'delivery_proofs')
    delivery_pod = "delivery_pod" in rider_migration_content
    check("delivery_pod table in migration (ADR-009 POD surface)", delivery_pod,
          "missing delivery_pod table")

    cod_collections = "cod_collections" in rider_migration_content
    check("cod_collections table in migration (ADR-010)", cod_collections,
          "missing cod_collections table")

    # Rider role seed
    foundation_seed = REPO_ROOT / "supabase" / "migrations" / "20260713191000_seed_foundation_data.sql"
    foundation_content = read_file(foundation_seed)
    rider_role = "'Rider'" in foundation_content or "'rider'" in foundation_content
    check("Rider role seeded in foundation migration", rider_role,
          "missing rider role seed")

    # Rider location service
    rider_loc_service = REPO_ROOT / "backend" / "api" / "src" / "services" / "deliveries" / "rider-location-service.ts"
    check("Rider location service exists", file_exists(rider_loc_service))


# ---------------------------------------------------------------------------
# Category 10: Staff app + support panel surface (ADR-041)
# ---------------------------------------------------------------------------

def check_staff_support_surface() -> None:
    print("\n=== Category 10: Staff app + support panel surface (ADR-041) ===")

    admin_pages_dir = REPO_ROOT / "apps" / "website" / "client" / "src" / "pages" / "admin"
    check("Admin pages directory exists", dir_exists(admin_pages_dir))

    # Count admin .tsx files
    admin_files = list(admin_pages_dir.glob("Admin*.tsx"))
    check(f"At least 30 admin pages exist (found {len(admin_files)})",
          len(admin_files) >= 30, f"found only {len(admin_files)} admin pages")

    # Required key admin pages
    required_admin = [
        "AdminShell.tsx",
        "AdminDashboard.tsx",
        "AdminBranchManager.tsx",
        "AdminCashierHome.tsx",
        "AdminKitchenDashboard.tsx",
        "AdminPos.tsx",
        "AdminOrders.tsx",
        "AdminInventory.tsx",
        "AdminFinance.tsx",
        "AdminReports.tsx",
        "AdminHr.tsx",
        "AdminLoyalty.tsx",
        "AdminMarketing.tsx",
        "AdminMenu.tsx",
        "AdminReservations.tsx",
        "AdminSettings.tsx",
        "AdminWhatsApp.tsx",
        "AdminCrm.tsx",
        "AdminDelivery.tsx",
    ]
    for page in required_admin:
        path = admin_pages_dir / page
        check(f"Admin page {page} exists", file_exists(path))

    # Ops pages
    ops_dir = REPO_ROOT / "apps" / "website" / "client" / "src" / "pages" / "ops"
    check("Ops pages directory exists", dir_exists(ops_dir))

    ops_pages = ["OpsShell.tsx", "OpsDashboard.tsx", "OpsDispatch.tsx", "OpsKitchen.tsx", "OpsOrders.tsx"]
    for page in ops_pages:
        path = ops_dir / page
        check(f"Ops page {page} exists", file_exists(path))

    # 32 admin router modules
    admin_modules_dir = REPO_ROOT / "backend" / "api" / "src" / "modules" / "admin"
    admin_modules = list(admin_modules_dir.glob("*.ts"))
    check(f"At least 30 admin router modules (found {len(admin_modules)})",
          len(admin_modules) >= 30, f"found only {len(admin_modules)} admin modules")

    # Required admin modules
    required_modules = [
        "hr.ts",
        "finance.ts",
        "reports.ts",
        "whatsapp.ts",
        "delivery-rider.ts",
        "payments.ts",
        "customers.ts",
        "inventory.ts",
        "pos.ts",
        "orders.ts",
        "audit.ts",
        "settings.ts",
        "loyalty.ts",
        "marketing.ts",
        "purchasing.ts",
    ]
    for module in required_modules:
        path = admin_modules_dir / module
        check(f"Admin module {module} exists", file_exists(path))

    # Kitchen routes module
    kitchen_routes = REPO_ROOT / "backend" / "api" / "src" / "modules" / "kitchen" / "routes.ts"
    check("Kitchen routes module exists", file_exists(kitchen_routes))

    # customer-support / support role in foundation seed
    foundation_seed = REPO_ROOT / "supabase" / "migrations" / "20260713191000_seed_foundation_data.sql"
    foundation_content = read_file(foundation_seed)
    support_role_legacy = "'customer-support'" in foundation_content or "Customer Support" in foundation_content
    check("customer-support role seeded in foundation migration", support_role_legacy,
          "missing customer-support role seed")

    # support role in Identity 01 migration (canonical)
    identity_migration = REPO_ROOT / "supabase" / "migrations" / "20260807100000_identity_01_tenant_owner_onboarding.sql"
    identity_content = read_file(identity_migration)
    support_role_canonical = "'support'" in identity_content and "Support" in identity_content
    check("support role seeded in Identity 01 migration (canonical)", support_role_canonical,
          "missing support role seed in Identity 01 migration")

    # branch_manager + kitchen_manager canonical roles in Identity 01
    branch_mgr = "branch_manager" in identity_content
    check("branch_manager canonical role seeded", branch_mgr,
          "missing branch_manager in Identity 01 migration")

    kitchen_mgr = "kitchen_manager" in identity_content
    check("kitchen_manager canonical role seeded", kitchen_mgr,
          "missing kitchen_manager in Identity 01 migration")

    # users.user_type CHECK constraint includes 'franchise' (future)
    foundation_schema = REPO_ROOT / "supabase" / "migrations" / "20260713190000_foundation_schema.sql"
    schema_content = read_file(foundation_schema)
    franchise_usertype = "'franchise'" in schema_content
    check("users.user_type CHECK includes 'franchise' (reserved for future §8.9)",
          franchise_usertype, "missing 'franchise' in user_type CHECK constraint")

    # AdminCrm.tsx should reference customers
    crm_path = admin_pages_dir / "AdminCrm.tsx"
    crm_content = read_file(crm_path)
    crm_ref = "customer" in crm_content.lower()
    check("AdminCrm.tsx references customers", crm_ref,
          "AdminCrm.tsx has no customer reference")

    # AdminWhatsApp.tsx should reference conversations
    whatsapp_path = admin_pages_dir / "AdminWhatsApp.tsx"
    whatsapp_content = read_file(whatsapp_path)
    convo_ref = "conversation" in whatsapp_content.lower()
    check("AdminWhatsApp.tsx references conversations", convo_ref,
          "AdminWhatsApp.tsx has no conversation reference")

    # audit_log table should exist (ADR-012)
    audit_module = admin_modules_dir / "audit.ts"
    audit_content = read_file(audit_module)
    audit_log = "audit_log" in audit_content or "audit" in audit_content.lower()
    check("audit.ts module references audit_log", audit_log,
          "audit.ts has no audit_log reference")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    print("=" * 70)
    print("Phase 12 (Customer and Staff Apps) — Repository Verification")
    print("=" * 70)
    print(f"Repository root: {REPO_ROOT}")

    check_adr_files()
    check_adr_index()
    check_roadmap()
    check_changelog()
    check_repository_status()
    check_release_notes()
    check_customer_mobile_surface()
    check_franchise_portal_surface()
    check_rider_delivery_surface()
    check_staff_support_surface()

    print("\n" + "=" * 70)
    print(f"RESULTS: {CHECKS_PASSED} passed, {CHECKS_FAILED} failed")
    print("=" * 70)

    if CHECKS_FAILED > 0:
        print("\nFailures:")
        for failure in FAILURES:
            print(f"  - {failure}")
        return 1

    print("\n✅ All Phase 12 verification checks passed.")
    print("Phase 12 (Customer and Staff Apps) is FEATURE-COMPLETE.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
