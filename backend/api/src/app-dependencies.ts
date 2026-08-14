import type { EnvironmentStatus } from "./config/env.js";
import type { AuthTokenVerifier } from "./middleware/auth.js";
import type { MessageProviderAdapter } from "./services/providers/adapter.js";
import { resolveWhatsAppAdapter } from "./services/whatsapp/adapter-factory.js";
import {
  createSupabaseAuthProfileRepository,
  createSupabaseAuthTokenVerifier,
  type AuthPrincipalRepository,
} from "./services/auth/supabase.js";
import { createSupabaseCatalogDataSource } from "./services/catalog/supabase.js";
import type { CatalogDataSource } from "./services/catalog/types.js";
import { createOrdersDataSource } from "./services/orders/supabase.js";
import type { OrdersDataSource } from "./services/orders/types.js";
import {
  createBranchOrderManagementDataSource,
  type BranchOrderManagementDataSource,
} from "./services/orders/management.js";
import {
  createRestaurantBillsService,
  type RestaurantBillsService,
} from "./services/bills/restaurant-bills.js";
import {
  createKitchenTicketsService,
  type KitchenTicketsService,
} from "./services/kitchen/tickets.js";
import {
  createSupabaseStaffInviteRepository,
  type StaffInviteRepository,
} from "./services/staff/invites.js";
import {
  createRestaurantTablesDataSource,
  type RestaurantTablesDataSource,
} from "./services/tables/management.js";
import { createQrTokenValidator, type QrTokenValidator } from "./services/tables/qr.js";
import {
  createDeliveryOperationsDataSource,
  type DeliveryOperationsDataSource,
} from "./services/deliveries/operations.js";
import {
  createDineInSessionsService,
  type DineInSessionsService,
} from "./services/dine-in/sessions.js";
import {
  createCustomerAddressesDataSourceFromEnv,
  type CustomerAddressesDataSource,
} from "./services/addresses/customer-addresses.js";
import {
  createCustomerOrdersDataSourceFromEnv,
  type CustomerOrdersDataSource,
} from "./services/orders/customer-history.js";
import {
  createCustomerFavoritesFromEnv,
  type CustomerFavoritesDataSource,
} from "./services/favorites/customer-favorites.js";
import {
  createCustomerReviewsFromEnv,
  type CustomerReviewsDataSource,
} from "./services/reviews/customer-reviews.js";
import {
  createFloorConfigurationService,
  type FloorConfigurationService,
} from "./services/floor/configuration.js";
import {
  createMenuManagementService,
  type MenuManagementService,
} from "./services/menu/management.js";
import {
  createReservationsService,
  type ReservationsService,
} from "./services/reservations/management.js";
import {
  createPublicBookingService,
  type PublicBookingService,
} from "./services/reservations/public-booking.js";
import {
  createTableServiceOperations,
  type TableServiceOperations,
} from "./services/dine-in/table-service.js";
import {
  createPaymentSettlementService,
  type PaymentSettlementService,
} from "./services/payments/settlement.js";
import {
  createDepositService,
  type DepositService,
} from "./services/reservations/deposits.js";
import {
  createOutboxWorker,
  type OutboxWorker,
} from "./services/notifications/outbox-worker.js";
import {
  createManualContactService,
  type ManualContactService,
} from "./services/notifications/manual-contact.js";
import {
  createStaffAssignmentService,
  type StaffAssignmentService,
} from "./services/staff/assignments.js";
import {
  createBookingPolicyService,
  type BookingPolicyService,
} from "./services/reservations/booking-policy.js";
import {
  createOpeningOperationsService,
  type OpeningOperationsService,
} from "./services/opening/operations.js";
import {
  createOpeningGovernanceService,
  type OpeningGovernanceService,
} from "./services/opening/governance.js";
import {
  createOpeningDryRunService,
  type OpeningDryRunService,
} from "./services/opening/dry-run.js";
import {
  createOrganizationSettingsService,
  type OrganizationSettingsService,
} from "./services/settings/organization.js";
import {
  createBranchProfileService,
  type BranchProfileService,
} from "./services/branches/profile.js";
import {
  createDeliverySettingsService,
  type DeliverySettingsService,
} from "./services/settings/delivery.js";
import {
  createBranchSettingsService,
  type BranchSettingsService,
} from "./services/settings/branch.js";
import {
  createHrEmployeesService,
  type HrEmployeesService,
} from "./services/hr/employees.js";
import {
  createHrWorkforceService,
  type HrWorkforceService,
} from "./services/hr/workforce.js";
import {
  createHrSchedulingService,
  type HrSchedulingService,
} from "./services/hr/scheduling.js";
import {
  createHrPayrollService,
  type HrPayrollService,
} from "./services/hr/payroll.js";
import {
  createInventoryService,
  type InventoryService,
} from "./services/inventory/management.js";
import {
  createInventoryRecipeService,
  type InventoryRecipeService,
} from "./services/inventory/recipes.js";
import {
  createPurchasingService,
  type PurchasingService,
} from "./services/purchasing/management.js";
import {
  createSupplierPortalService,
  type SupplierPortalService,
} from "./services/supplier-portal/management.js";
import {
  createPosZReportService,
  type PosZReportService,
} from "./services/pos/z-report.js";
import {
  createReportsService,
  type ReportsService,
} from "./services/reports/sales.js";
import {
  createAnalyticsService,
  type AnalyticsService,
} from "./services/analytics/engine.js";
import {
  createLoyaltyService,
  type LoyaltyService,
} from "./services/loyalty/management.js";
import {
  createLoyaltyDepthService,
  type LoyaltyDepthService,
} from "./services/loyalty/depth.js";
import {
  createMarketingService,
  type MarketingService,
} from "./services/marketing/coupons.js";
import {
  createMarketingDepthService,
  type MarketingDepthService,
} from "./services/marketing/depth.js";
import {
  createAiPlatformService,
  type AiPlatformService,
} from "./services/ai/platform.js";
import {
  createFinanceService,
  type FinanceService,
} from "./services/finance/management.js";
import {
  createFinanceOperationsService,
  type FinanceOperationsService,
} from "./services/finance/operations.js";
import {
  createFinancePhase2Service,
  type FinancePhase2Service,
} from "./services/finance/phase2.js";
import {
  createWhatsAppAdminService,
  type WhatsAppAdminService,
} from "./services/whatsapp/admin-service.js";

export interface AppDependencies {
  catalogDataSource: CatalogDataSource;
  ordersDataSource: OrdersDataSource;
  branchOrderManagement: BranchOrderManagementDataSource;
  kitchenTickets: KitchenTicketsService;
  restaurantBills: RestaurantBillsService;
  deliveryOperations: DeliveryOperationsDataSource;
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffInviteRepository: StaffInviteRepository;
  staffAssignments: StaffAssignmentService;
  restaurantTables: RestaurantTablesDataSource;
  qrTokenValidator: QrTokenValidator;
  dineInSessions: DineInSessionsService;
  customerAddresses: CustomerAddressesDataSource;
  customerOrders: CustomerOrdersDataSource;
  customerFavorites: CustomerFavoritesDataSource;
  customerReviews: CustomerReviewsDataSource;
  floorConfiguration: FloorConfigurationService;
  menuManagement: MenuManagementService;
  reservations: ReservationsService;
  publicBooking: PublicBookingService;
  bookingPolicy: BookingPolicyService;
  openingOperations: OpeningOperationsService;
  openingGovernance: OpeningGovernanceService;
  openingDryRun: OpeningDryRunService;
  organizationSettings: OrganizationSettingsService;
  branchProfile: BranchProfileService;
  deliverySettings: DeliverySettingsService;
  branchSettings: BranchSettingsService;
  hrEmployees: HrEmployeesService;
  hrWorkforce: HrWorkforceService;
  hrScheduling: HrSchedulingService;
  hrPayroll: HrPayrollService;
  inventory: InventoryService;
  inventoryRecipes: InventoryRecipeService;
  purchasing: PurchasingService;
  supplierPortal: SupplierPortalService;
  finance: FinanceService;
  financeOperations: FinanceOperationsService;
  financePhase2: FinancePhase2Service;
  posZReport: PosZReportService;
  reports: ReportsService;
  analytics: AnalyticsService;
  loyalty: LoyaltyService;
  loyaltyDepth: LoyaltyDepthService;
  marketing: MarketingService;
  marketingDepth: MarketingDepthService;
  aiPlatform: AiPlatformService;
  tableService: TableServiceOperations;
  paymentSettlement: PaymentSettlementService;
  deposits: DepositService;
  outboxWorker: OutboxWorker;
  manualContact: ManualContactService;
  /** WhatsApp provider adapter (ADR-003/004). Null when TELEPIZZA_WHATSAPP_MODE=disabled. */
  whatsappAdapter: MessageProviderAdapter | null;
  /** WhatsApp admin service (conversations, templates, send). Always present. */
  whatsappAdmin: WhatsAppAdminService;
  inviteAppOrigin: string;
  envStatus: EnvironmentStatus;
}

export function createAppDependencies(envStatus: EnvironmentStatus): AppDependencies {
  const qrTokenValidator = createQrTokenValidator(envStatus);
  const finance = createFinanceService(envStatus);
  const financePhase2 = createFinancePhase2Service(envStatus, finance);
  const financeOperations = createFinanceOperationsService(envStatus, finance);
  const hrWorkforce = createHrWorkforceService(envStatus);
  const hrPayroll = createHrPayrollService(envStatus, financePhase2);
  const loyalty = createLoyaltyService(envStatus);
  const marketing = createMarketingService(envStatus);
  const loyaltyDepth = createLoyaltyDepthService(envStatus, loyalty);
  const marketingDepth = createMarketingDepthService(envStatus, marketing);
  return {
    catalogDataSource: createSupabaseCatalogDataSource(envStatus),
    ordersDataSource: createOrdersDataSource(envStatus),
    branchOrderManagement: createBranchOrderManagementDataSource(envStatus),
    kitchenTickets: createKitchenTicketsService(envStatus),
    restaurantBills: createRestaurantBillsService(envStatus),
    deliveryOperations: createDeliveryOperationsDataSource(envStatus),
    authTokenVerifier: createSupabaseAuthTokenVerifier(envStatus),
    authProfileRepository: createSupabaseAuthProfileRepository(envStatus),
    staffInviteRepository: createSupabaseStaffInviteRepository(envStatus),
    staffAssignments: createStaffAssignmentService(envStatus),
    restaurantTables: createRestaurantTablesDataSource(envStatus),
    qrTokenValidator,
    dineInSessions: createDineInSessionsService(envStatus, qrTokenValidator),
    customerAddresses: createCustomerAddressesDataSourceFromEnv(envStatus),
    customerOrders: createCustomerOrdersDataSourceFromEnv(envStatus),
    customerFavorites: createCustomerFavoritesFromEnv(envStatus),
    customerReviews: createCustomerReviewsFromEnv(envStatus),
    floorConfiguration: createFloorConfigurationService(envStatus),
    menuManagement: createMenuManagementService(envStatus),
    reservations: createReservationsService(envStatus),
    publicBooking: createPublicBookingService(envStatus),
    bookingPolicy: createBookingPolicyService(envStatus),
    openingOperations: createOpeningOperationsService(envStatus),
    openingGovernance: createOpeningGovernanceService(envStatus),
    openingDryRun: createOpeningDryRunService(envStatus),
    organizationSettings: createOrganizationSettingsService(envStatus),
    branchProfile: createBranchProfileService(envStatus),
    deliverySettings: createDeliverySettingsService(envStatus),
    branchSettings: createBranchSettingsService(envStatus),
    hrEmployees: createHrEmployeesService(envStatus),
    hrWorkforce,
    hrScheduling: createHrSchedulingService(envStatus),
    inventory: createInventoryService(envStatus),
    inventoryRecipes: createInventoryRecipeService(envStatus),
    purchasing: createPurchasingService(envStatus),
    supplierPortal: createSupplierPortalService(envStatus),
    finance,
    financeOperations,
    financePhase2,
    hrPayroll,
    posZReport: createPosZReportService(envStatus),
    reports: createReportsService(envStatus),
    analytics: createAnalyticsService({
      envStatus,
      finance,
      financePhase2,
      financeOperations,
      hrWorkforce,
      hrPayroll,
      loyalty,
      marketing,
    }),
    loyalty,
    loyaltyDepth,
    marketing,
    marketingDepth,
    aiPlatform: createAiPlatformService(envStatus),
    tableService: createTableServiceOperations(envStatus),
    paymentSettlement: createPaymentSettlementService(envStatus),
    deposits: createDepositService(envStatus),
    outboxWorker: createOutboxWorker(envStatus),
    manualContact: createManualContactService(envStatus),
    whatsappAdapter: resolveWhatsAppAdapter(envStatus),
    whatsappAdmin: createWhatsAppAdminService(envStatus),
    inviteAppOrigin: envStatus.config.corsOrigin,
    envStatus,
  };
}
