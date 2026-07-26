import { Redirect } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { resolveStaffHome } from "@/lib/admin-access";

export default function AdminIndexRedirect() {
  const { roles, permissions, isSuperAdmin, isLoading, branchIds } = useAuth();

  if (isLoading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] text-sm text-[var(--admin-muted)]">
        Loading…
      </div>
    );
  }

  const home = resolveStaffHome({ roles, permissions, isSuperAdmin, branchIds });
  return <Redirect to={home} />;
}
