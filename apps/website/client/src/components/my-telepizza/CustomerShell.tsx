import type { ReactNode } from "react";
import { CustomerBottomNav } from "@/components/my-telepizza/CustomerBottomNav";
import { CustomerDesktopNav } from "@/components/my-telepizza/CustomerDesktopNav";
import type { PrimaryTab } from "@/lib/my-telepizza-nav";

type CustomerShellProps = {
  activeTab: PrimaryTab;
  identity: ReactNode;
  children: ReactNode;
};

/**
 * Authenticated customer layout: identity, primary nav, content outlet.
 * Staff/admin chrome must never import this shell.
 */
export function CustomerShell({ activeTab, identity, children }: CustomerShellProps) {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-10">
      <a
        href="#my-telepizza-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-2xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-red focus:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        Skip to My Telepizza content
      </a>
      <div className="container max-w-5xl space-y-6">
        {identity}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <aside className="order-2 hidden lg:order-1 lg:block">
            <CustomerDesktopNav active={activeTab} />
          </aside>
          <div id="my-telepizza-main" className="order-1 min-w-0 space-y-6 lg:order-2" tabIndex={-1}>
            {children}
          </div>
        </div>
      </div>
      <CustomerBottomNav active={activeTab} />
    </div>
  );
}
