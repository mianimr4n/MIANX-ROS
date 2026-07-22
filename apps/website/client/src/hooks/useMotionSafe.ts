import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type MotionSafeOptions = {
  /** Skip pointer-driven / decorative motion on narrow viewports. */
  disableOnMobile?: boolean;
  mobileBreakpointPx?: number;
};

/**
 * Returns whether decorative / 3D / pointer motion should run.
 * Always false when prefers-reduced-motion is set.
 */
export function useMotionSafe(options: MotionSafeOptions = {}): boolean {
  const reduced = usePrefersReducedMotion();
  const { disableOnMobile = false, mobileBreakpointPx = 768 } = options;

  if (reduced) return false;
  if (disableOnMobile && typeof window !== "undefined") {
    return window.innerWidth >= mobileBreakpointPx;
  }
  return true;
}
