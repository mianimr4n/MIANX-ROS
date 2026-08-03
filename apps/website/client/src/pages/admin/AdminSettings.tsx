import { useEffect, useMemo, useState } from "react";

import { ConfigurationInsights } from "@/components/admin/settings/ConfigurationInsights";
import { SettingsCategoryNav, SettingsSearch } from "@/components/admin/settings/SettingsNav";
import { SettingsHeader } from "@/components/admin/settings/SettingsHeader";
import { SettingsReadinessBanner } from "@/components/admin/settings/SettingsReadinessBanner";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsPrimitives";
import { SettingsWorkspace } from "@/components/admin/settings/SettingsWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminSettings, primaryRoleLabel } from "@/lib/admin-access";
import {
  SEEDED_PERMISSIONS,
  SEEDED_ROLES,
  SETTINGS_CATEGORIES,
  buildConfigurationInsights,
  searchSettingsCategories,
  summarizeBranches,
  type SettingsCategoryId,
} from "@/lib/admin-settings";
import { AdminShell } from "./AdminShell";

const LIVE_MODULE_HINTS: Partial<Record<SettingsCategoryId, string>> = {
  organization: "Organization and branch profiles use the Save button in the panel above.",
  branches: "Organization and branch profiles use the Save button in the panel above.",
  delivery: "Delivery settings use the Save button in the panel above.",
  menu: "Menu prices and categories are saved in Admin → Menu.",
  inventory: "Manage stock in Admin → Inventory. Policy toggles are Planned for Phase 2.",
  purchasing: "Manage suppliers and POs in Admin → Purchasing. Approval-limit config is Planned for Phase 2.",
  orders: "Manage the order pipeline in Admin → Orders.",
  pos: "Opening device rows use Save / Delete above. Receipt policy is Planned for Phase 2.",
  kitchen: "Manage tickets in Admin → Kitchen. Station and printer config is Planned for Phase 2.",
  reports: "Open Admin → Reports for sales analytics and CSV export.",
  hr: "Open Admin → HR for the team directory and workforce tools.",
  finance: "Use Admin → Finance for CoA/journals/TB/P&L (Partial LIVE). Settings tax controls remain Planned — no invented rates.",
  operations: "Opening operations use per-row Save / Delete in the panels above.",
  payments: "Opening operations use per-row Save / Delete in the panels above.",
  communications: "Opening operations use per-row Save / Delete in the panels above.",
};

export default function AdminSettings() {
  const { permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel, allowedBranches, isLoading: branchesLoading } = useAdminBranch();

  const allowed = canAccessAdminSettings({ roles, permissions, isSuperAdmin });
  useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>("organization");

  const filteredCategories = useMemo(() => searchSettingsCategories(search), [search]);
  const branchSummary = useMemo(() => summarizeBranches(allowedBranches), [allowedBranches]);

  const insights = useMemo(
    () =>
      buildConfigurationInsights({
        branchCount: branchSummary.total,
        branchLabel,
        roleCount: SEEDED_ROLES.length,
        permissionCount: SEEDED_PERMISSIONS.length,
      }),
    [branchLabel, branchSummary.total],
  );

  useEffect(() => {
    if (filteredCategories.length === 0) return;
    if (!filteredCategories.some((c) => c.id === activeCategory)) {
      setActiveCategory(filteredCategories[0].id);
    }
  }, [activeCategory, filteredCategories]);

  const onRefresh = () => {
    // Soft refresh of settings workspace — no persistence API for foundation categories.
  };

  const moduleHint = LIVE_MODULE_HINTS[activeCategory];

  return (
    <AdminShell title="Settings & Configuration">
      <SettingsHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />
      <SettingsReadinessBanner />

      <SettingsSearch value={search} onChange={setSearch} resultCount={filteredCategories.length} />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsCategoryNav
          categories={filteredCategories}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />
        <div>
          <SettingsWorkspace
            categoryId={activeCategory}
            branches={allowedBranches}
            branchesLoading={branchesLoading}
            roles={roles}
            permissions={permissions}
            isSuperAdmin={isSuperAdmin}
          />
          {moduleHint ? (
            <p className="mt-4 text-xs text-[var(--admin-muted)]" role="status">
              {moduleHint}
            </p>
          ) : (
            <SettingsSaveBar />
          )}
        </div>
      </div>

      <ConfigurationInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Branches in scope: {branchSummary.total} · Operating: {branchSummary.operating} · Categories:{" "}
        {SETTINGS_CATEGORIES.length}
      </p>
    </AdminShell>
  );
}
