import type { EnvironmentStatus } from "./config/env.js";
import type { AuthTokenVerifier } from "./middleware/auth.js";
import {
  createSupabaseAuthProfileRepository,
  createSupabaseAuthTokenVerifier,
  type AuthProfileRepository,
} from "./services/auth/supabase.js";
import { createSupabaseCatalogDataSource } from "./services/catalog/supabase.js";
import type { CatalogDataSource } from "./services/catalog/types.js";
import { createOrdersDataSource } from "./services/orders/supabase.js";
import type { OrdersDataSource } from "./services/orders/types.js";

export interface AppDependencies {
  catalogDataSource: CatalogDataSource;
  ordersDataSource: OrdersDataSource;
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthProfileRepository;
}

export function createAppDependencies(envStatus: EnvironmentStatus): AppDependencies {
  return {
    catalogDataSource: createSupabaseCatalogDataSource(envStatus),
    ordersDataSource: createOrdersDataSource(envStatus),
    authTokenVerifier: createSupabaseAuthTokenVerifier(envStatus),
    authProfileRepository: createSupabaseAuthProfileRepository(envStatus),
  };
}
