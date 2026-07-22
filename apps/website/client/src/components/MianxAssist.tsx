import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  Gift,
  HelpCircle,
  Leaf,
  MessageCircle,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { BRAND } from "@/lib/brand";

type AssistAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
  external?: boolean;
  comingSoon?: boolean;
  icon: typeof Sparkles;
  onSelect?: () => void;
};

/**
 * Mianx Assist — deterministic frontend helper.
 * Routes to existing pages/filters; never claims live AI API responses.
 */
export function MianxAssist() {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const [, navigate] = useLocation();
  const { items } = useMenuCatalog();
  const panelId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const hasVegetarianMeta = useMemo(
    () =>
      items.some((item) => {
        const hay = `${item.name} ${item.description ?? ""} ${(item as { tags?: string[] }).tags?.join(" ") ?? ""}`.toLowerCase();
        return hay.includes("veg") || hay.includes("vegetarian");
      }),
    [items],
  );

  const whatsappUrl = `https://wa.me/92${BRAND.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent("Hi Telepizza, I need help choosing an order.")}`;

  const actions: AssistAction[] = useMemo(() => {
    const list: AssistAction[] = [
      {
        id: "choose",
        label: "Help me choose a pizza",
        description: "Open signature pizzas",
        href: "/menu?category=Signature%20Pizzas",
        icon: Search,
      },
      {
        id: "spicy",
        label: "Show spicy options",
        description: "Search spicy on the menu",
        href: "/menu?q=spicy",
        icon: Flame,
      },
      {
        id: "family",
        label: "Show family deals",
        description: "Jump to verified deals",
        href: "/menu?category=Deals",
        icon: Gift,
      },
      {
        id: "track",
        label: "Track my order",
        description: "Open order tracking",
        href: "/track",
        icon: Sparkles,
      },
      {
        id: "support",
        label: "Contact support",
        description: "Call or message the branch",
        href: "/contact",
        icon: HelpCircle,
      },
      {
        id: "whatsapp",
        label: "Open WhatsApp",
        description: "Message Telepizza Multan",
        href: whatsappUrl,
        external: true,
        icon: MessageCircle,
      },
      {
        id: "portal",
        label: "Go to My Telepizza",
        description: "Orders, addresses & account",
        href: "/my-telepizza",
        icon: UserRound,
      },
    ];

    if (hasVegetarianMeta) {
      list.splice(4, 0, {
        id: "veg",
        label: "Find vegetarian items",
        description: "Search vegetarian on the menu",
        href: "/menu?q=veg",
        icon: Leaf,
      });
    } else {
      list.splice(4, 0, {
        id: "veg-soon",
        label: "Find vegetarian items",
        description: "Coming soon — dietary tags not yet published",
        comingSoon: true,
        icon: Leaf,
      });
    }

    return list;
  }, [hasVegetarianMeta, whatsappUrl]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleAction = (action: AssistAction) => {
    if (action.comingSoon) {
      setReply("Coming soon — this filter isn’t available on the published menu yet.");
      return;
    }
    if (action.external && action.href) {
      window.open(action.href, "_blank", "noopener,noreferrer");
      setReply("Opening WhatsApp so you can message the Multan branch.");
      return;
    }
    if (action.href) {
      navigate(action.href);
      setOpen(false);
      setReply(null);
    }
  };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[var(--z-assist)] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="w-[min(100vw-2rem,22rem)] overflow-hidden rounded-3xl border border-border bg-white shadow-2xl shadow-brand-red/15"
          >
            <div className="flex items-start justify-between gap-3 brand-gradient px-4 py-3 text-white">
              <div className="min-w-0">
                <p id={`${panelId}-title`} className="font-[var(--font-display)] font-bold text-base">
                  Mianx Assist
                </p>
                <p className="mt-0.5 text-xs text-white/85">
                  Hi, I’m Mianx Assist. I can help you explore the menu, find deals and reach support.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 hover:bg-white/15 focus-ring-brand"
                aria-label="Close Mianx Assist"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(60vh,26rem)] overflow-y-auto p-3 space-y-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleAction(action)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-brand-cream/40 px-3 py-3 text-left transition-colors hover:border-brand-red/30 hover:bg-brand-cream focus-ring-brand"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-red shadow-sm">
                    <action.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-brand-charcoal">
                      {action.label}
                      {action.comingSoon ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Coming soon
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-border bg-muted/40 px-4 py-3">
              {reply ? (
                <p className="text-xs text-brand-charcoal" role="status" aria-live="polite">
                  {reply}
                </p>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                Recommendations are based on available Telepizza menu information. Powered by{" "}
                {BRAND.poweredBy}.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="btn-press h-14 rounded-full bg-brand-red px-5 text-white shadow-xl shadow-brand-red/35 hover:bg-brand-red-dark"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="font-[var(--font-accent)] font-bold">Mianx Assist</span>
      </Button>
    </div>
  );
}

/** Lightweight helper used by Menu query deep-links from Assist. */
export function applyMenuQueryFromSearch(searchString: string): string {
  const params = new URLSearchParams(searchString);
  return params.get("q")?.trim() ?? "";
}
