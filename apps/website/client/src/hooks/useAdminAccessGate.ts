import { useEffect } from "react";
import { useLocation } from "wouter";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Wait for AuthContext hydration before treating a failed permission check as unauthorized.
 * Prevents hard-refresh / deep-link races where roles/permissions are still empty.
 */
export function useAdminAccessGate(allowed: boolean): {
  isAuthLoading: boolean;
  /** True once auth has settled and the principal is allowed. */
  gateReady: boolean;
} {
  const { isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    // Shell handles signed-out users; avoid unauthorized bounce during session restore.
    if (!isAuthenticated) return;
    if (!allowed) {
      setLocation("/admin/unauthorized");
    }
  }, [allowed, isAuthenticated, isLoading, setLocation]);

  return {
    isAuthLoading: isLoading,
    gateReady: !isLoading && isAuthenticated && allowed,
  };
}
