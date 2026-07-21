import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  Heart,
  HelpCircle,
  LogOut,
  Bell,
  Shield,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type AccountMenuAction = {
  id: string;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  icon: typeof UserRound;
};

const DEFAULT_ITEMS: Omit<AccountMenuAction, "onClick">[] = [
  {
    id: "profile",
    label: "Personal details",
    description: "Name, email, and phone",
    href: "/my-telepizza/account/profile",
    icon: UserRound,
  },
  {
    id: "security",
    label: "Security",
    description: "Password and email change",
    href: "/my-telepizza/account/security",
    icon: Shield,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Prefs and device inbox",
    href: "/my-telepizza/account/notifications",
    icon: Bell,
  },
  {
    id: "favorites",
    label: "Favorites",
    description: "Saved menu items",
    href: "/my-telepizza/favorites",
    icon: Heart,
  },
  {
    id: "help",
    label: "Help",
    description: "Contact and support",
    href: "/contact",
    icon: HelpCircle,
  },
];

type CustomerAccountMenuProps = {
  onLogout: () => void;
  extra?: ReactNode;
};

/** Secondary Account destinations (not primary nav weight). */
export function CustomerAccountMenu({ onLogout, extra }: CustomerAccountMenuProps) {
  return (
    <section
      className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4"
      aria-labelledby="account-menu-heading"
    >
      <div>
        <h2 id="account-menu-heading" className="font-bold text-lg">
          Account
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your details, security, and quieter tools — without cluttering the main menu.
        </p>
      </div>
      <ul className="space-y-2">
        {DEFAULT_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href!}
                className="flex min-h-12 items-center gap-3 rounded-2xl border border-border/80 px-3 py-3 transition-colors hover:border-brand-red/25 hover:bg-brand-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-red">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-brand-charcoal">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {extra}
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full rounded-2xl"
        onClick={onLogout}
        aria-label="Log out of your Telepizza account"
      >
        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
        Logout
      </Button>
    </section>
  );
}
