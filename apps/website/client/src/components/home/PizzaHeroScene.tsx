import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { handleImageError } from "@/lib/image-fallback";

const CHIPS = [
  { label: "Freshly prepared", top: "12%", left: "8%" },
  { label: "Smart order routing", top: "22%", right: "4%" },
  { label: "Live order updates", bottom: "18%", left: "6%" },
] as const;

type PizzaHeroSceneProps = {
  /** Product image used as the pizza layer */
  imageSrc: string;
  imageAlt?: string;
  className?: string;
};

/**
 * Lightweight CSS depth pizza composition — no heavy 3D runtime.
 * Pointer parallax on desktop; static optimized composition when reduced-motion or mobile.
 */
export function PizzaHeroScene({
  imageSrc,
  imageAlt = "Telepizza signature pizza",
  className = "",
}: PizzaHeroSceneProps) {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [allowPointer, setAllowPointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const sync = () => setAllowPointer(mq.matches && !reduced);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [reduced]);

  useEffect(() => {
    if (!allowPointer) {
      setTilt({ x: 0, y: 0 });
      return;
    }
    const el = rootRef.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Math.max(-8, Math.min(8, py * -14)),
        y: Math.max(-10, Math.min(10, px * 16)),
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [allowPointer]);

  return (
    <div
      ref={rootRef}
      className={`xp-scene relative mx-auto aspect-square w-full max-w-[520px] ${className}`}
      aria-hidden={false}
      role="img"
      aria-label={imageAlt}
    >
      {/* Soft branded glow */}
      <div
        className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(245,184,0,0.45)_0%,rgba(227,30,36,0.28)_42%,transparent_70%)]"
        style={
          allowPointer
            ? { transform: `translate3d(${tilt.y * 0.4}px, ${tilt.x * 0.4}px, 0)` }
            : undefined
        }
      />

      {/* Orbit ring */}
      <div
        className={`pointer-events-none absolute inset-[6%] rounded-full border border-brand-gold/25 ${
          reduced ? "" : "xp-rotate-slow"
        }`}
        aria-hidden
      />

      {/* Steam wisps */}
      {!reduced ? (
        <>
          <div
            className="xp-steam pointer-events-none absolute left-[28%] top-[10%] h-16 w-8 rounded-full bg-white/25 blur-md"
            aria-hidden
          />
          <div
            className="xp-steam pointer-events-none absolute left-[48%] top-[6%] h-20 w-10 rounded-full bg-white/20 blur-md"
            style={{ animationDelay: "0.6s" }}
            aria-hidden
          />
          <div
            className="xp-steam pointer-events-none absolute left-[62%] top-[12%] h-14 w-7 rounded-full bg-white/15 blur-md"
            style={{ animationDelay: "1.1s" }}
            aria-hidden
          />
        </>
      ) : null}

      {/* Floating ingredient dots */}
      <span
        className={`pointer-events-none absolute left-[18%] top-[30%] h-3 w-3 rounded-full bg-brand-red shadow-lg ${
          reduced ? "" : "xp-float"
        }`}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute right-[16%] top-[38%] h-2.5 w-2.5 rounded-full bg-brand-gold shadow-md ${
          reduced ? "" : "xp-float"
        }`}
        style={reduced ? undefined : { animationDelay: "0.8s" }}
        aria-hidden
      />
      <span
        className={`pointer-events-none absolute bottom-[28%] right-[22%] h-3.5 w-3.5 rounded-full bg-brand-orange shadow-md ${
          reduced ? "" : "xp-float"
        }`}
        style={reduced ? undefined : { animationDelay: "1.4s" }}
        aria-hidden
      />

      {/* Pizza product layer */}
      <div
        className="xp-layer absolute inset-[14%] overflow-hidden rounded-full shadow-[0_28px_60px_rgba(0,0,0,0.35)] ring-4 ring-white/15"
        style={{
          transform: allowPointer
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(24px)`
            : "rotateX(6deg) rotateY(-4deg) translateZ(12px)",
          transition: allowPointer ? "transform 120ms var(--ease-out)" : undefined,
        }}
      >
        <img
          src={imageSrc}
          alt=""
          onError={handleImageError}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
          width={640}
          height={640}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-charcoal/30 via-transparent to-white/10" />
      </div>

      {/* Status chips */}
      {CHIPS.map((chip) => (
        <div
          key={chip.label}
          className={`pointer-events-none absolute z-10 max-w-[9.5rem] rounded-full border border-white/20 bg-brand-charcoal/75 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm sm:max-w-none sm:text-xs ${
            reduced ? "" : "xp-float"
          }`}
          style={{
            top: "top" in chip ? chip.top : undefined,
            left: "left" in chip ? chip.left : undefined,
            right: "right" in chip ? chip.right : undefined,
            bottom: "bottom" in chip ? chip.bottom : undefined,
            transform: allowPointer
              ? `translate3d(${tilt.y * -0.35}px, ${tilt.x * -0.35}px, 40px)`
              : undefined,
          }}
        >
          {chip.label}
        </div>
      ))}
    </div>
  );
}
