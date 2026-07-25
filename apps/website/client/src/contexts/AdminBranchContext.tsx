import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { canViewMultipleAssignedBranches } from "@/lib/admin-access";
import type { Branch } from "@/lib/telepizza-types";

const STORAGE_KEY = "telepizza.admin.branchScope";

export type AdminBranchSelection =
  | { mode: "all" }
  | { mode: "branch"; branchId: string };

type AdminBranchContextType = {
  selection: AdminBranchSelection;
  setSelection: (next: AdminBranchSelection) => void;
  /** UUID passed to admin APIs; null means all branches in scope. */
  branchIdFilter: string | null;
  allowedBranches: Branch[];
  canSelectAll: boolean;
  label: string;
  isLoading: boolean;
};

const AdminBranchContext = createContext<AdminBranchContextType | null>(null);

function readStoredSelection(): AdminBranchSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminBranchSelection;
    if (parsed?.mode === "all") return { mode: "all" };
    if (parsed?.mode === "branch" && typeof parsed.branchId === "string") {
      return { mode: "branch", branchId: parsed.branchId };
    }
  } catch {
    return null;
  }
  return null;
}

export function AdminBranchProvider({ children }: { children: ReactNode }) {
  const { allBranches, isLoading } = useBranch();
  const { branchIds, isSuperAdmin, permissions, roles } = useAuth();
  // Aggregate mode sends branchIdFilter=null; the server uses principal.branchIds
  // (or all branches for super-admin). The client never sends an explicit ID list.
  const canSelectAll = canViewMultipleAssignedBranches({
    roles,
    permissions,
    isSuperAdmin,
    branchIds,
  });

  const allowedBranches = useMemo(() => {
    if (isSuperAdmin) return allBranches;
    if (branchIds.length === 0) return [];
    return allBranches.filter((branch) => branchIds.includes(branch.id));
  }, [allBranches, branchIds, isSuperAdmin]);

  const [selection, setSelectionState] = useState<AdminBranchSelection>(() => {
    return readStoredSelection() ?? { mode: "all" };
  });

  const setSelection = useCallback((next: AdminBranchSelection) => {
    setSelectionState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (selection.mode === "all") {
      if (!canSelectAll) {
        const fallback = allowedBranches[0];
        if (fallback) {
          setSelection({ mode: "branch", branchId: fallback.id });
        }
      }
      return;
    }

    const stillAllowed = allowedBranches.some((b) => b.id === selection.branchId);
    if (!stillAllowed) {
      if (canSelectAll) {
        setSelection({ mode: "all" });
      } else if (allowedBranches[0]) {
        setSelection({ mode: "branch", branchId: allowedBranches[0].id });
      }
    }
  }, [allowedBranches, canSelectAll, isLoading, selection, setSelection]);

  const branchIdFilter = selection.mode === "branch" ? selection.branchId : null;

  const label = useMemo(() => {
    if (selection.mode === "all") {
      // Super-admin sees every branch; multi-branch staff see only their assigned set.
      return isSuperAdmin ? "All Branches" : "Assigned Branches";
    }
    return (
      allowedBranches.find((b) => b.id === selection.branchId)?.shortName ??
      allowedBranches.find((b) => b.id === selection.branchId)?.name ??
      "Branch"
    );
  }, [allowedBranches, isSuperAdmin, selection]);

  const value = useMemo(
    () => ({
      selection,
      setSelection,
      branchIdFilter,
      allowedBranches,
      canSelectAll,
      label,
      isLoading,
    }),
    [allowedBranches, branchIdFilter, canSelectAll, isLoading, label, selection, setSelection],
  );

  return <AdminBranchContext.Provider value={value}>{children}</AdminBranchContext.Provider>;
}

export function useAdminBranch() {
  const ctx = useContext(AdminBranchContext);
  if (!ctx) throw new Error("useAdminBranch must be used within AdminBranchProvider");
  return ctx;
}
