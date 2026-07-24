import {
  Banknote,
  Bike,
  BookOpen,
  ClipboardList,
  CookingPot,
  Gift,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { AdminModuleCard } from "@/components/admin/AdminModuleCard";
import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

const MODULES = [
  {
    title: "Orders",
    description: "Live queue, detail, and payment state.",
    href: "/admin/orders",
    icon: ClipboardList,
    statusLabel: "Live",
    statusTone: "live" as const,
    actionLabel: "Open orders",
    available: true,
  },
  {
    title: "POS",
    description: "Counter sales and dine-in billing.",
    href: "/admin/pos",
    icon: ShoppingBag,
    statusLabel: "Live",
    statusTone: "live" as const,
    actionLabel: "Open POS",
    available: true,
  },
  {
    title: "Kitchen",
    description: "Prep queue, ready tickets, delays.",
    href: "/admin/kitchen",
    icon: CookingPot,
    statusLabel: "Live",
    statusTone: "live" as const,
    actionLabel: "Open kitchen",
    available: true,
  },
  {
    title: "Delivery",
    description: "Dispatch queue, riders, and delivery status.",
    href: "/admin/delivery",
    icon: Bike,
    statusLabel: "Live",
    statusTone: "live" as const,
    actionLabel: "Open delivery",
    available: true,
  },
  {
    title: "WhatsApp",
    description: "WhatsApp-attributed order operations queue.",
    href: "/admin/whatsapp",
    icon: MessageSquare,
    statusLabel: "Derived",
    statusTone: "ready" as const,
    actionLabel: "Open WhatsApp",
    available: true,
  },
  {
    title: "CRM",
    description: "Customer intelligence from live order history.",
    href: "/admin/crm",
    icon: Users,
    statusLabel: "Live",
    statusTone: "live" as const,
    actionLabel: "Open CRM",
    available: true,
  },
  {
    title: "Loyalty",
    description: "Repeat-customer intelligence — points ledger pending.",
    href: "/admin/loyalty",
    icon: Gift,
    statusLabel: "Derived",
    statusTone: "ready" as const,
    actionLabel: "Open loyalty",
    available: true,
  },
  {
    title: "Menu",
    description: "Master catalog browser — write APIs pending.",
    href: "/admin/menu",
    icon: BookOpen,
    statusLabel: "Live",
    statusTone: "live" as const,
    actionLabel: "Open menu",
    available: true,
  },
  {
    title: "Inventory",
    description: "Stock control foundation — ledger and recipes pending.",
    href: "/admin/inventory",
    icon: Package,
    statusLabel: "Foundation",
    statusTone: "soon" as const,
    actionLabel: "Open inventory",
    available: true,
  },
  {
    title: "Purchasing",
    description: "Supplier and PO foundation — procurement backend pending.",
    href: "/admin/purchasing",
    icon: ShoppingCart,
    statusLabel: "Foundation",
    statusTone: "soon" as const,
    actionLabel: "Open purchasing",
    available: true,
  },
  {
    title: "Finance",
    description: "Sales, taxes, cash, and ledger foundation.",
    href: "/admin/finance",
    icon: Wallet,
    statusLabel: "Foundation",
    statusTone: "soon" as const,
    actionLabel: "Open finance",
    available: true,
  },
  {
    title: "HR & Workforce",
    description: "Workforce foundation — directory, attendance, payroll pending.",
    href: "/admin/hr",
    icon: UtensilsCrossed,
    statusLabel: "Foundation",
    statusTone: "soon" as const,
    actionLabel: "Open HR",
    available: true,
  },
  {
    title: "Reports",
    description: "Executive BI — live today data, trends pending.",
    href: "/admin/reports",
    icon: Banknote,
    statusLabel: "Partial",
    statusTone: "ready" as const,
    actionLabel: "Open reports",
    available: true,
  },
  {
    title: "Settings",
    description: "Governance foundation — verified read-only config.",
    href: "/admin/settings",
    icon: Settings,
    statusLabel: "Foundation",
    statusTone: "soon" as const,
    actionLabel: "Open settings",
    available: true,
  },
];

export function OperationsModuleGrid() {
  return (
    <section aria-labelledby="operations-grid-heading">
      <AdminSectionTitle
        eyebrow="Operations"
        title="Command modules"
        description="Enterprise entry points for the Restaurant Operating System."
      />
      <h2 id="operations-grid-heading" className="sr-only">
        Operations modules
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {MODULES.map((module) => (
          <AdminModuleCard key={module.title} {...module} />
        ))}
      </div>
    </section>
  );
}
