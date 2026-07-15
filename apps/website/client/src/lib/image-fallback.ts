import type { SyntheticEvent } from "react";
import { BRAND } from "@/lib/brand";

/**
 * Inline SVG placeholder in Telepizza brand colors. Being a data URI, it can
 * never 404, so a missing or broken image file degrades to a branded tile
 * instead of the browser's broken-image icon.
 */
export const FALLBACK_FOOD_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#FFF7F3"/>
    <circle cx="200" cy="138" r="64" fill="#E31E24"/>
    <circle cx="200" cy="138" r="50" fill="#F5B800"/>
    <circle cx="182" cy="124" r="7" fill="#B5121B"/>
    <circle cx="214" cy="146" r="7" fill="#B5121B"/>
    <circle cx="196" cy="162" r="6" fill="#B5121B"/>
    <text x="200" y="242" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#1F1F1F">Telepizza</text>
  </svg>`,
)}`;

/**
 * onError handler for <img>: swaps the source to the inline placeholder
 * exactly once (guarded so a failing placeholder cannot loop).
 */
export function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;

  if (image.src !== FALLBACK_FOOD_IMAGE) {
    image.src = FALLBACK_FOOD_IMAGE;
  }
}

export const FALLBACK_LOGO_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="#E31E24"/>
    <text x="60" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF">T</text>
  </svg>`,
)}`;

export function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;

  if (!image.src.endsWith(BRAND.logoWordmark) && image.src !== FALLBACK_LOGO_IMAGE) {
    image.src = BRAND.logoWordmark;
    return;
  }

  if (image.src !== FALLBACK_LOGO_IMAGE) {
    image.src = FALLBACK_LOGO_IMAGE;
  }
}
