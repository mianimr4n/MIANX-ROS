import { useEffect, useMemo, useState } from "react";

import {
  ConfigurationInsights,
  SettingsCapabilityMatrix,
} from "@/components/admin/settings/ConfigurationInsights";
import { SettingsCategoryNav, SettingsSearch } from "@/components/admin/settings/SettingsNav";
import { SettingsHeader } from "@/components/admin/settings/SettingsHeader";
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
  capabilityMatrix,
  searchSettingsCategories,
  summarizeBranches,
  type SettingsCategoryId,
} from "@/lib/admin-settings";
import { AdminShell } from "./AdminShell";

export default function AdminSettings() {
  const { permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel, allowedBranches, isLoading: branchesLoading } = useAdminBranch();

  const allowed = canAccessAdminSettings({ roles, permissions, isSuperAdmin });
  useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>("organization");

  const filteredCategories = useMemo(() => searchSettingsCategories(search), [search]);
  const matrix = useMemo(() => capabilityMatrix(), []);
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

  return (
    <AdminShell title="Settings & Configuration">
      <SettingsHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

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
          {activeCategory === "operations" ||
          activeCategory === "payments" ||
          activeCategory === "communications" ||
          activeCategory === "pos" ||
          activeCategory === "organization" ||
          activeCategory === "branches" ||
          activeCategory === "delivery" ||
          activeCategory === "menu" ||
          activeCategory === "inventory" ||
          activeCategory === "finance" ? (
            <p className="mt-4 text-xs text-[var(--admin-muted)]" role="status">
              {activeCategory === "organization" || activeCategory === "branches"
                ? "Organization and branch profiles use the Save button in the panel above."
                : activeCategory === "delivery"
                  ? "Delivery settings use the Save button in the panel above."
                  : activeCategory === "menu"
                    ? "Menu prices and categories are saved in Admin → Menu."
                    : activeCategory === "inventory" || activeCategory === "finance"
                      ? "These settings are Planned for Phase 2."
                      : "Opening operations use per-row Save / Delete in the panels above."}
            </p>
          ) : (
            <SettingsSaveBar />
          )}
        </div>
      </div>

      <SettingsCapabilityMatrix rows={matrix} />

      <ConfigurationInsights items={insights} />

      <p className="sr-only" aria-live="polite">
        Branches in scope: {branchSummary.total} · Operating: {branchSummary.operating} · Categories:{" "}
        {SETTINGS_CATEGORIES.length}
      </p>
    </AdminShell>
  );
}
