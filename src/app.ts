import express, { json } from "express";

import { corsMiddleware, logCorsConfig } from "./config/cors";
import { attachRuntimeLogging, logStartup } from "./config/runtime-logger";
import { requireSecret } from "./presentation/middleware/require-secret";
import { createPublicRoutes } from "./presentation/routes/public";
import { createProtectedRoutes } from "./presentation/routes/protected";
import { createAdminDashboardUseCases } from "./application/use-cases/admin-dashboard";
import { createAuthUseCases } from "./application/use-cases/auth";
import { createCatalogAdminUseCases } from "./application/use-cases/catalog-admin";
import { createCatalogUseCases } from "./application/use-cases/catalog";
import { createCheckoutUseCases } from "./application/use-cases/checkout";
import { createInventoryUseCases } from "./application/use-cases/inventory";
import { createOrderFulfillmentUseCases } from "./application/use-cases/order-fulfillment";
import { createProfileUseCases } from "./application/use-cases/profile";
import { createSyncUseCases } from "./application/use-cases/sync";
import { createUsersUseCases } from "./application/use-cases/users";
import { createBranchUseCases } from "./application/use-cases/branches";
import { env, envChecks } from "./config/env";
import * as adminDashboardRepository from "./infrastructure/repositories/admin-dashboard-service";
import * as authRepository from "./infrastructure/repositories/auth-service";
import * as catalogAdminRepository from "./infrastructure/repositories/catalog-admin-service";
import * as catalogRepository from "./infrastructure/repositories/catalog-service";
import * as checkoutRepository from "./infrastructure/repositories/checkout-service";
import * as inventoryRepository from "./infrastructure/repositories/inventory-service";
import * as profileRepository from "./infrastructure/repositories/profile-service";
import * as syncRepository from "./infrastructure/repositories/sync-service";
import * as usersRepository from "./infrastructure/repositories/user-service";
import * as branchRepository from "./infrastructure/repositories/branch-service";
import * as emailService from "./infrastructure/adapters/email-service";
import { startOrderExpirationJob } from "./infrastructure/jobs/order-expiration-job";

export function createApp() {
  const app = express();
  logStartup();
  logCorsConfig();
  app.use(corsMiddleware);
  attachRuntimeLogging(app);
  app.use(json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/__health", (_req, res) => {
    res.status(200).json({
      ok: true,
      env: Object.fromEntries(
        Object.entries(envChecks).map(([key, value]) => [key, value ? "SET" : "MISSING"])
      )
    });
  });

  const authUseCases = createAuthUseCases({ authRepository, emailService });
  const catalogUseCases = createCatalogUseCases({ catalogRepository });
  const syncUseCases = createSyncUseCases({ syncRepository });
  const profileUseCases = createProfileUseCases({ profileRepository });
  const usersUseCases = createUsersUseCases({ usersRepository });
  const adminDashboardUseCases = createAdminDashboardUseCases({ adminDashboardRepository });
  const inventoryUseCases = createInventoryUseCases({ inventoryRepository });
  const catalogAdminUseCases = createCatalogAdminUseCases({ catalogAdminRepository });
  const checkoutUseCases = createCheckoutUseCases({ checkoutRepository, emailService });
  const orderFulfillmentUseCases = createOrderFulfillmentUseCases({
    orderFulfillmentRepository: checkoutRepository,
    emailService
  });
  const branchUseCases = createBranchUseCases({ branchRepository });

  app.use(createPublicRoutes({ catalogUseCases, authUseCases, branchUseCases }));
  app.use(requireSecret);
  app.use(
    createProtectedRoutes({
      adminDashboardUseCases,
      catalogUseCases,
      catalogAdminUseCases,
      checkoutUseCases,
      orderFulfillmentUseCases,
      branchUseCases,
      inventoryUseCases,
      syncUseCases,
      profileUseCases,
      usersUseCases
    })
  );

  startOrderExpirationJob({
    orderFulfillmentUseCases,
    intervalMs: env.orderExpirationIntervalMs
  });

  return app;
}
