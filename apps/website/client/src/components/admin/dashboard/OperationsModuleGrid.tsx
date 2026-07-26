import {
  Banknote,
  Bike,
  ClipboardList,
  CookingPot,
  Package,
  Settings,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { AdminModuleCard, type AdminModuleState } from "@/components/admin/AdminModuleCard";
import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

type ModuleDef = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
  moduleState: AdminModuleState;
  actionLabel: string;
  navigable: boolean;
};

/** D1-supported operations cards only. Routes must exist; planned cards stay disabled. */
const MODULES: ModuleDef[] = [
  {
    title: "Orders",
    description: "Live queue, detail, and payment state.",
    href: "/admin/orders",
    icon: ClipboardList,
    moduleState: "operational",
    actionLabel: "Open orders",
    navigable: true,
  },
  {
    title: "Kitchen",
    description: "Live kitchen display — tickets, prep, and delays.",
    href: "/admin/kitchen-dashboard",
    icon: CookingPot,
    moduleState: "operational",
    actionLabel: "Open kitchen display",
    navigable: true,
  },
  {
    title: "Delivery",
    description: "Dispatch queue, riders, and delivery status.",
    href: "/admin/delivery",
    icon: Bike,
    moduleState: "operational",
    actionLabel: "Open delivery",
    navigable: true,
  },
  {
    title: "POS",
    description: "Counter sales and dine-in billing.",
    href: "/admin/pos",
    icon: ShoppingBag,
    moduleState: "limited",
    actionLabel: "Open POS",
    navigable: true,
  },
  {
    title: "CRM",
    description: "Customer intelligence from live order history.",
    href: "/admin/crm",
    icon: Users,
    moduleState: "limited",
    actionLabel: "Open CRM",
    navigable: true,
  },
  {
    title: "Inventory",
    description: "Stock records — automatic alerts arrive later.",
    href: "/admin/inventory",
    icon: Package,
    moduleState: "limited",
    actionLabel: "Open inventory",
    navigable: true,
  },
  {
    title: "Finance",
    description: "Sales records — full ledger arrives later.",
    href: "/admin/finance",
    icon: Wallet,
    moduleState: "limited",
    actionLabel: "Open finance",
    navigable: true,
  },
  {
    title: "Employees",
    description: "Staff directory — payroll arrives later.",
    href: "/admin/hr",
    icon: UtensilsCrossed,
    moduleState: "limited",
    actionLabel: "Open employees",
    navigable: true,
  },
  {
    title: "Reports",
    description: "Today's sales and orders — trends arrive later.",
    href: "/admin/reports",
    icon: Banknote,
    moduleState: "limited",
    actionLabel: "Open reports",
    navigable: true,
  },
  {
    title: "Settings",
    description: "Branch and system configuration.",
    href: "/admin/settings",
    icon: Settings,
    moduleState: "limited",
    actionLabel: "Open settings",
    navigable: true,
  },
];

export function OperationsModuleGrid() {
  return (
    <section aria-label="Operations modules">
      <AdminSectionTitle
        eyebrow="Operations"
        title="Command modules"
        description="Everything you can open today. Modules that aren't ready stay disabled."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {MODULES.map((module) => (
          <AdminModuleCard key={module.title} {...module} />
        ))}
      </div>
    </section>
  );
}
