import type { EnvironmentStatus } from "./config/env.js";
import type { AuthTokenVerifier } from "./middleware/auth.js";
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
  createHrEmployeesService,
  type HrEmployeesService,
} from "./services/hr/employees.js";
import {
  createInventoryService,
  type InventoryService,
} from "./services/inventory/management.js";
import {
  createPurchasingService,
  type PurchasingService,
} from "./services/purchasing/management.js";
import {
  createAiPlatformService,
  type AiPlatformService,
} from "./services/ai/platform.js";

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
  hrEmployees: HrEmployeesService;
  inventory: InventoryService;
  purchasing: PurchasingService;
  aiPlatform: AiPlatformService;
  tableService: TableServiceOperations;
  paymentSettlement: PaymentSettlementService;
  deposits: DepositService;
  outboxWorker: OutboxWorker;
  manualContact: ManualContactService;
  inviteAppOrigin: string;
  envStatus: EnvironmentStatus;
}

export function createAppDependencies(envStatus: EnvironmentStatus): AppDependencies {
  const qrTokenValidator = createQrTokenValidator(envStatus);
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
    hrEmployees: createHrEmployeesService(envStatus),
    inventory: createInventoryService(envStatus),
    purchasing: createPurchasingService(envStatus),
    aiPlatform: createAiPlatformService(envStatus),
    tableService: createTableServiceOperations(envStatus),
    paymentSettlement: createPaymentSettlementService(envStatus),
    deposits: createDepositService(envStatus),
    outboxWorker: createOutboxWorker(envStatus),
    manualContact: createManualContactService(envStatus),
    inviteAppOrigin: envStatus.config.corsOrigin,
    envStatus,
  };
}
