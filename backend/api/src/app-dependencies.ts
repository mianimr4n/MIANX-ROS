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
  createDineInSessionsService,
  type DineInSessionsService,
} from "./services/dine-in/sessions.js";

export interface AppDependencies {
  catalogDataSource: CatalogDataSource;
  ordersDataSource: OrdersDataSource;
  branchOrderManagement: BranchOrderManagementDataSource;
  kitchenTickets: KitchenTicketsService;
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffInviteRepository: StaffInviteRepository;
  restaurantTables: RestaurantTablesDataSource;
  qrTokenValidator: QrTokenValidator;
  dineInSessions: DineInSessionsService;
  inviteAppOrigin: string;
}

export function createAppDependencies(envStatus: EnvironmentStatus): AppDependencies {
  const qrTokenValidator = createQrTokenValidator(envStatus);
  return {
    catalogDataSource: createSupabaseCatalogDataSource(envStatus),
    ordersDataSource: createOrdersDataSource(envStatus),
    branchOrderManagement: createBranchOrderManagementDataSource(envStatus),
    kitchenTickets: createKitchenTicketsService(envStatus),
    authTokenVerifier: createSupabaseAuthTokenVerifier(envStatus),
    authProfileRepository: createSupabaseAuthProfileRepository(envStatus),
    staffInviteRepository: createSupabaseStaffInviteRepository(envStatus),
    restaurantTables: createRestaurantTablesDataSource(envStatus),
    qrTokenValidator,
    dineInSessions: createDineInSessionsService(envStatus, qrTokenValidator),
    inviteAppOrigin: envStatus.config.corsOrigin,
  };
}
