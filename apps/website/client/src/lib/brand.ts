import { fetchApiData, isApiConfigured } from "@/lib/api";

export const BRAND = {
  name: "Telepizza",
  legalName: "Telepizza Pakistan",
  tagline: "Love At First Bite",
  region: "Pakistan",
  logoPrimary: "/images/telepizza-logo-primary.jpg",
  logoWordmark: "/images/telepizza-logo.png",
  favicon: "/favicon.jpg",
  phone: "0304-1110495",
  hours: "10:00 AM – 2:30 AM",
  city: "Multan",
  colors: {
    red: "#E31E24",
    redDark: "#B5121B",
    gold: "#F5B800",
    cream: "#FFF7F3",
  },
} as const;

/**
 * Live brand config from GET /api/v1/brand (Mianx ROS Multi-Tenant Foundation,
 * Phase C — see supabase/migrations/20260822000000_.../20260823000000_...).
 *
 * `BRAND` above stays the synchronous source of truth for every existing
 * page — it's imported directly, at render time, in 100+ files, and this
 * site's own convention (see lib/api.ts `isApiConfigured`) is that a missing
 * or slow backend must never block or break customer-facing rendering. This
 * function is an ADDITIVE accessor for new code (e.g. a future admin brand
 * editor) that wants the live, database-backed value. It always resolves —
 * on any fetch failure, or when no API base URL is configured, it resolves
 * to the same values as `BRAND` above, so it is always safe to call.
 *
 * Swapping the site-wide synchronous `BRAND` for this at app boot (so a
 * second tenant's brand actually renders differently) is a larger follow-up
 * — it needs a loading/suspense strategy in the app's bootstrap, not just
 * this accessor. See the Multi-Tenant Foundation Phase C notes.
 */
export interface BrandValues {
  name: string;
  legalName: string;
  tagline: string;
  region: string;
  logoPrimary: string;
  logoWordmark: string;
  favicon: string;
  phone: string;
  hours: string;
  city: string;
  colors: {
    red: string;
    redDark: string;
    gold: string;
    cream: string;
  };
}

export async function fetchBrandConfig(): Promise<BrandValues> {
  if (!isApiConfigured) {
    return BRAND;
  }

  try {
    const config = await fetchApiData<{
      name: string;
      legalName: string;
      tagline: string;
      region: string;
      logoPrimary: string;
      logoWordmark: string;
      favicon: string;
      phone: string;
      hours: string;
      city: string;
      colors: {
        primary: string;
        primaryDark: string;
        accent: string;
        background: string;
      };
    }>("/brand", { timeoutMs: 4000 });

    return {
      name: config.name,
      legalName: config.legalName,
      tagline: config.tagline,
      region: config.region,
      logoPrimary: config.logoPrimary,
      logoWordmark: config.logoWordmark,
      favicon: config.favicon,
      phone: config.phone,
      hours: config.hours,
      city: config.city,
      colors: {
        red: config.colors.primary,
        redDark: config.colors.primaryDark,
        gold: config.colors.accent,
        cream: config.colors.background,
      },
    };
  } catch {
    // Network error, timeout, or backend not configured — never break the site.
    return BRAND;
  }
}

/** Homepage + hero deal slugs — verified baseline prices only. */
export const VERIFIED_DEAL_IDS = [
  "family-deal",
  "pizza-fest",
  "pair-deal",
  "knock-out-deal",
] as const;
