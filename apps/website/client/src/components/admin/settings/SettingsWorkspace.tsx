import type { SettingsCategoryId } from "@/lib/admin-settings";
import type { Branch } from "@/lib/telepizza-types";
import {
  AdvancedSettings,
  BranchSettings,
  CommunicationSettings,
  CustomerLoyaltySettings,
  DataPrivacySettings,
  DeliverySettings,
  FinanceTaxSettings,
  HrSettings,
  IntegrationSettings,
  InventorySettings,
  KitchenSettings,
  LocalizationSettings,
  MenuSettings,
  OrderSettings,
  OrganizationSettings,
  PaymentSettings,
  POSSettings,
  PurchasingSettings,
  ReportsSettings,
  RestaurantOperationsSettings,
  SecurityAuditSettings,
  UsersAccessSettings,
} from "@/components/admin/settings/SettingsPanels";

export function SettingsWorkspace({
  categoryId,
  branches,
  branchesLoading,
  roles,
  permissions,
  isSuperAdmin,
}: {
  categoryId: SettingsCategoryId;
  branches: Branch[];
  branchesLoading: boolean;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}) {
  switch (categoryId) {
    case "organization":
      return <OrganizationSettings />;
    case "branches":
      return <BranchSettings branches={branches} loading={branchesLoading} />;
    case "operations":
      return <RestaurantOperationsSettings />;
    case "orders":
      return <OrderSettings />;
    case "pos":
      return <POSSettings />;
    case "kitchen":
      return <KitchenSettings />;
    case "delivery":
      return <DeliverySettings />;
    case "menu":
      return <MenuSettings />;
    case "inventory":
      return <InventorySettings />;
    case "purchasing":
      return <PurchasingSettings />;
    case "reports":
      return <ReportsSettings />;
    case "hr":
      return <HrSettings />;
    case "finance":
      return <FinanceTaxSettings />;
    case "payments":
      return <PaymentSettings />;
    case "loyalty":
      return <CustomerLoyaltySettings />;
    case "communications":
      return <CommunicationSettings />;
    case "access":
      return (
        <UsersAccessSettings roles={roles} permissions={permissions} isSuperAdmin={isSuperAdmin} />
      );
    case "localization":
      return <LocalizationSettings />;
    case "integrations":
      return <IntegrationSettings />;
    case "security":
      return <SecurityAuditSettings />;
    case "privacy":
      return <DataPrivacySettings />;
    case "advanced":
      return <AdvancedSettings />;
    default:
      return <OrganizationSettings />;
  }
}
