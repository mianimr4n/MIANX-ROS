import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { isApiConfigured } from "@/lib/api";
import { fetchBranches } from "@/lib/telepizza-api";
import type { Branch } from "@/lib/telepizza-types";

export const fallbackBranches: Branch[] = [
  {
    id: "royal-orchard",
    code: "royal-orchard",
    name: "Royal Orchard Branch",
    shortName: "Royal Orchard",
    address: "Royal Orchard Main Business Plaza, Musa Wala, Multan, 60000",
    phone: "0304-1110495",
    city: "Multan",
    coordinates: { lat: 30.1723, lng: 71.4727 },
    hours: "10:00 AM – 2:30 AM",
    status: "operating",
  },
  {
    id: "northern-bypass",
    code: "northern-bypass",
    name: "Northern Bypass Road Branch",
    shortName: "Northern Bypass",
    address: "Northern Bypass Road, Multan",
    phone: "Coming Soon",
    city: "Multan",
    coordinates: { lat: 30.1985, lng: 71.4893 },
    hours: "Coming Soon",
    status: "coming-soon",
  },
];

const defaultBranch = fallbackBranches[0]!;

interface BranchContextType {
  selectedBranch: Branch;
  setSelectedBranch: (branch: Branch) => void;
  allBranches: Branch[];
  isLoading: boolean;
  error: string | null;
  reloadBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [allBranches, setAllBranches] = useState<Branch[]>(fallbackBranches);
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranch.id);
  const [isLoading, setIsLoading] = useState(isApiConfigured);
  const [error, setError] = useState<string | null>(null);

  const reloadBranches = async () => {
    // Bundled branches are the canonical fallback. The live API is optional
    // and only consulted when explicitly configured.
    if (!isApiConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const remoteBranches = await fetchBranches();

      if (remoteBranches.length > 0) {
        setAllBranches(remoteBranches);
        setSelectedBranchId((currentBranchId) => {
          const existing = remoteBranches.find((branch) => branch.id === currentBranchId);
          if (existing) {
            return existing.id;
          }

          return remoteBranches.find((branch) => branch.status === "operating")?.id ?? remoteBranches[0].id;
        });
      }

      setError(null);
    } catch (loadError) {
      console.warn("Live branch data unavailable; using bundled branches.", loadError);
      setAllBranches((currentBranches) => (currentBranches.length > 0 ? currentBranches : fallbackBranches));
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reloadBranches();
  }, []);

  const selectedBranch = useMemo(() => {
    return (
      allBranches.find((branch) => branch.id === selectedBranchId) ??
      allBranches[0] ??
      defaultBranch
    );
  }, [allBranches, selectedBranchId]);

  const setSelectedBranch = (branch: Branch) => {
    setSelectedBranchId(branch.id);
  };

  return (
    <BranchContext.Provider
      value={{ selectedBranch, setSelectedBranch, allBranches, isLoading, error, reloadBranches }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used within a BranchProvider");
  return context;
}
