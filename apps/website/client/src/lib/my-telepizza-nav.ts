import type { LucideIcon } from "lucide-react";
import { Gift, Home, MapPin, Package, UserRound } from "lucide-react";

/** Internal hub content panels. */
export type HubSection =
  | "overview"
  | "account"
  | "profile"
  | "addresses"
  | "security"
  | "orders"
  | "loyalty"
  | "notifications";

/** Five primary customer destinations. */
export type PrimaryTab = "home" | "orders" | "addresses" | "rewards" | "account";

export type PrimaryNavItem = {
  id: PrimaryTab;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const PRIMARY_NAV: PrimaryNavItem[] = [
  { id: "home", label: "Home", href: "/my-telepizza", icon: Home },
  { id: "orders", label: "Orders", href: "/my-telepizza/orders", icon: Package },
  { id: "addresses", label: "Addresses", href: "/my-telepizza/addresses", icon: MapPin },
  { id: "rewards", label: "Rewards", href: "/my-telepizza/rewards", icon: Gift },
  { id: "account", label: "Account", href: "/my-telepizza/account", icon: UserRound },
];

const PATH_TO_SECTION: Record<string, HubSection> = {
  "/my-telepizza": "overview",
  "/my-telepizza/": "overview",
  "/my-telepizza/orders": "orders",
  "/my-telepizza/addresses": "addresses",
  "/my-telepizza/rewards": "loyalty",
  "/my-telepizza/account": "account",
  "/my-telepizza/account/profile": "profile",
  "/my-telepizza/account/security": "security",
  "/my-telepizza/account/notifications": "notifications",
  "/my-telepizza/favorites": "account",
};

/** Legacy hash → section (pre–S1 URLs). */
const HASH_TO_SECTION: Record<string, HubSection> = {
  overview: "overview",
  dashboard: "overview",
  profile: "profile",
  addresses: "addresses",
  security: "security",
  orders: "orders",
  loyalty: "loyalty",
  rewards: "loyalty",
  notifications: "notifications",
  account: "account",
};

export function pathForSection(section: HubSection): string {
  switch (section) {
    case "overview":
      return "/my-telepizza";
    case "orders":
      return "/my-telepizza/orders";
    case "addresses":
      return "/my-telepizza/addresses";
    case "loyalty":
      return "/my-telepizza/rewards";
    case "account":
      return "/my-telepizza/account";
    case "profile":
      return "/my-telepizza/account/profile";
    case "security":
      return "/my-telepizza/account/security";
    case "notifications":
      return "/my-telepizza/account/notifications";
    default:
      return "/my-telepizza";
  }
}

export function primaryTabForSection(section: HubSection): PrimaryTab {
  switch (section) {
    case "overview":
      return "home";
    case "orders":
      return "orders";
    case "addresses":
      return "addresses";
    case "loyalty":
      return "rewards";
    default:
      return "account";
  }
}

export function sectionFromLocation(pathname: string, hash = ""): HubSection {
  const normalized = (pathname.replace(/\/$/, "") || "/") as string;
  const hashKey = hash.replace(/^#/, "").toLowerCase();

  if (PATH_TO_SECTION[normalized]) {
    return PATH_TO_SECTION[normalized];
  }
  if (PATH_TO_SECTION[pathname]) {
    return PATH_TO_SECTION[pathname];
  }

  // Bare /my-telepizza with legacy hash
  if (normalized === "/my-telepizza" && hashKey && HASH_TO_SECTION[hashKey]) {
    return HASH_TO_SECTION[hashKey];
  }

  return "overview";
}

/**
 * If the customer opened a legacy `/my-telepizza#orders` URL on the home path,
 * return the canonical path to replace it with (or null if already canonical).
 */
export function legacyHashCanonicalPath(pathname: string, hash: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized !== "/my-telepizza") return null;
  const hashKey = hash.replace(/^#/, "").toLowerCase();
  if (!hashKey || hashKey === "overview" || hashKey === "dashboard") return null;
  const section = HASH_TO_SECTION[hashKey];
  if (!section) return null;
  const next = pathForSection(section);
  if (next === "/my-telepizza") return null;
  return next;
}

/** Resolve welcome display name without re-prompting when provider/stored name exists. */
export function resolveDisplayName(input: {
  editedOrStoredName?: string | null;
  providerFullName?: string | null;
  email?: string | null;
}): string {
  const stored = input.editedOrStoredName?.trim();
  if (stored) return stored;
  const provider = input.providerFullName?.trim();
  if (provider) return provider;
  const email = input.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] || "Customer";
  return "Customer";
}
