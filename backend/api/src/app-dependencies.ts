import type { EnvironmentStatus } from "./config/env.js";
import { createSupabaseCatalogDataSource } from "./services/catalog/supabase.js";
import type { CatalogDataSource } from "./services/catalog/types.js";

export interface AppDependencies {
  catalogDataSource: CatalogDataSource;
}

export function createAppDependencies(envStatus: EnvironmentStatus): AppDependencies {
  return {
    catalogDataSource: createSupabaseCatalogDataSource(envStatus),
  };
}
