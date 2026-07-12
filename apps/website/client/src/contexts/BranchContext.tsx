import { createContext, useContext, useState, type ReactNode } from "react";

export interface Branch {
  id: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  city: string;
  coordinates: { lat: number; lng: number };
  hours: string;
  status: "operating" | "coming-soon";
}

export const branches: Branch[] = [
  {
    id: "royal-orchard",
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

interface BranchContextType {
  selectedBranch: Branch;
  setSelectedBranch: (branch: Branch) => void;
  allBranches: Branch[];
}

const BranchContext = createContext<BranchContextType | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<Branch>(branches[0]);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, allBranches: branches }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used within a BranchProvider");
  return context;
}
