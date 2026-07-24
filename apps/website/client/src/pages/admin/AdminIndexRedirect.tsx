import { Redirect } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { isBranchManagerOnly, isKitchenOnly } from "@/lib/admin-access";

export default function AdminIndexRedirect() {
  const { roles, permissions, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] text-sm text-[var(--admin-muted)]">
        Loading…
      </div>
    );
  }

  const principal = { roles, permissions, isSuperAdmin };
  if (isKitchenOnly(principal)) {
    return <Redirect to="/admin/kitchen-dashboard" />;
  }
  if (isBranchManagerOnly(principal)) {
    return <Redirect to="/admin/branch" />;
  }

  return <Redirect to="/admin/dashboard" />;
}
