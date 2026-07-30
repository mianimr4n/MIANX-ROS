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

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  OperationModuleCard,
  type OperationModuleStatus,
} from "@/components/admin/dashboard/OperationModuleCard";

type ModuleDef = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
  status: OperationModuleStatus;
  primaryAction: string;
  enabled: boolean;
};

/** D1-supported operations cards only. Routes must exist; planned cards stay disabled. */
const MODULES: ModuleDef[] = [
  {
    title: "Orders",
    description: "Live queue, detail, and payment state.",
    href: "/admin/orders",
    icon: ClipboardList,
    status: "operational",
    primaryAction: "Open orders",
    enabled: true,
  },
  {
    title: "Kitchen",
    description: "Live kitchen display — tickets, prep, and delays.",
    href: "/admin/kitchen-dashboard",
    icon: CookingPot,
    status: "operational",
    primaryAction: "Open kitchen display",
    enabled: true,
  },
  {
    title: "Delivery",
    description: "Dispatch queue, riders, and delivery status.",
    href: "/admin/delivery",
    icon: Bike,
    status: "operational",
    primaryAction: "Open delivery",
    enabled: true,
  },
  {
    title: "POS",
    description: "Counter sales and dine-in billing.",
    href: "/admin/pos",
    icon: ShoppingBag,
    status: "limited",
    primaryAction: "Open POS",
    enabled: true,
  },
  {
    title: "CRM",
    description: "Customer intelligence from live order history.",
    href: "/admin/crm",
    icon: Users,
    status: "limited",
    primaryAction: "Open CRM",
    enabled: true,
  },
  {
    title: "Inventory",
    description: "Stock records — automatic alerts arrive later.",
    href: "/admin/inventory",
    icon: Package,
    status: "limited",
    primaryAction: "Open inventory",
    enabled: true,
  },
  {
    title: "Finance",
    description: "Sales records — full ledger arrives later.",
    href: "/admin/finance",
    icon: Wallet,
    status: "limited",
    primaryAction: "Open finance",
    enabled: true,
  },
  {
    title: "Employees",
    description: "Staff directory — payroll arrives later.",
    href: "/admin/hr",
    icon: UtensilsCrossed,
    status: "limited",
    primaryAction: "Open employees",
    enabled: true,
  },
  {
    title: "Reports",
    description: "Today's sales and orders — trends arrive later.",
    href: "/admin/reports",
    icon: Banknote,
    status: "limited",
    primaryAction: "Open reports",
    enabled: true,
  },
  {
    title: "Settings",
    description: "Branch and system configuration.",
    href: "/admin/settings",
    icon: Settings,
    status: "limited",
    primaryAction: "Open settings",
    enabled: true,
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
          <OperationModuleCard
            key={module.title}
            title={module.title}
            description={module.description}
            route={module.href}
            icon={module.icon}
            status={module.status}
            primaryAction={module.primaryAction}
            enabled={module.enabled}
          />
        ))}
      </div>
    </section>
  );
}
