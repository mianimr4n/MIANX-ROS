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
    cream: "#FFF7F3",
  },
} as const;

/** Homepage + hero deal slugs — verified baseline prices only. */
export const VERIFIED_DEAL_IDS = [
  "family-deal",
  "pizza-fest",
  "pair-deal",
  "knock-out-deal",
] as const;
