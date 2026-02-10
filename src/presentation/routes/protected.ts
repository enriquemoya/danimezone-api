import { Router } from "express";

import type { AdminDashboardUseCases } from "../../application/use-cases/admin-dashboard";
import type { CatalogAdminUseCases } from "../../application/use-cases/catalog-admin";
import type { CatalogUseCases } from "../../application/use-cases/catalog";
import type { CheckoutUseCases } from "../../application/use-cases/checkout";
import type { InventoryUseCases } from "../../application/use-cases/inventory";
import type { OrderFulfillmentUseCases } from "../../application/use-cases/order-fulfillment";
import type { ProfileUseCases } from "../../application/use-cases/profile";
import type { SyncUseCases } from "../../application/use-cases/sync";
import type { UsersUseCases } from "../../application/use-cases/users";
import type { BranchUseCases } from "../../application/use-cases/branches";
import { createCatalogController } from "../controllers/catalog-controller";
import { createAdminDashboardController } from "../controllers/admin-dashboard-controller";
import { createCatalogAdminController } from "../controllers/catalog-admin-controller";
import { createInventoryController } from "../controllers/inventory-controller";
import { createSyncController } from "../controllers/sync-controller";
import { createProfileController } from "../controllers/profile-controller";
import { requireAdmin } from "../middleware/require-admin";
import { requireAuth } from "../middleware/require-auth";
import { createUsersController } from "../controllers/users-controller";
import { createCheckoutController } from "../controllers/checkout-controller";
import { createBranchesController } from "../controllers/branches-controller";
import { createOrderFulfillmentController } from "../controllers/order-fulfillment-controller";

export function createProtectedRoutes(params: {
  adminDashboardUseCases: AdminDashboardUseCases;
  catalogUseCases: CatalogUseCases;
  catalogAdminUseCases: CatalogAdminUseCases;
  inventoryUseCases: InventoryUseCases;
  syncUseCases: SyncUseCases;
  profileUseCases: ProfileUseCases;
  usersUseCases: UsersUseCases;
  checkoutUseCases: CheckoutUseCases;
  branchUseCases: BranchUseCases;
  orderFulfillmentUseCases: OrderFulfillmentUseCases;
}) {
  const router = Router();
  const catalogController = createCatalogController(params.catalogUseCases);
  const adminDashboardController = createAdminDashboardController(params.adminDashboardUseCases);
  const catalogAdminController = createCatalogAdminController(params.catalogAdminUseCases);
  const inventoryController = createInventoryController(params.inventoryUseCases);
  const syncController = createSyncController(params.syncUseCases);
  const profileController = createProfileController(params.profileUseCases);
  const usersController = createUsersController(params.usersUseCases);
  const checkoutController = createCheckoutController(params.checkoutUseCases);
  const branchesController = createBranchesController(params.branchUseCases);
  const orderFulfillmentController = createOrderFulfillmentController(params.orderFulfillmentUseCases);

  router.post("/sync/events", syncController.recordEventsHandler);
  router.get("/sync/pending", syncController.getPendingHandler);
  router.post("/sync/ack", syncController.acknowledgeHandler);
  router.post("/orders", syncController.createOrderHandler);
  router.get("/read/products", syncController.readProductsHandler);
  router.get("/api/cloud/catalog/featured", catalogController.getFeaturedCatalogHandler);

  router.use("/profile", requireAuth);
  router.get("/profile/me", profileController.getProfileHandler);
  router.patch("/profile/me", profileController.updateProfileHandler);
  router.patch("/profile/password", profileController.updatePasswordHandler);

  router.use("/checkout", requireAuth);
  router.post("/checkout/drafts", checkoutController.createDraftHandler);
  router.get("/checkout/drafts/active", checkoutController.getActiveDraftHandler);
  router.post("/checkout/revalidate", checkoutController.revalidateHandler);
  router.post("/checkout/orders", checkoutController.createOrderHandler);
  router.get("/checkout/orders/:orderId", checkoutController.getOrderHandler);

  router.use("/orders", requireAuth);
  router.get("/orders", orderFulfillmentController.listCustomerOrdersHandler);
  router.get("/orders/:orderId", orderFulfillmentController.getCustomerOrderHandler);

  router.use("/admin", requireAdmin);
  router.get("/admin/dashboard/summary", adminDashboardController.getAdminSummaryHandler);
  router.get("/admin/inventory", inventoryController.listInventoryHandler);
  router.post("/admin/inventory/:productId/adjust", inventoryController.adjustInventoryHandler);
  router.get("/admin/catalog/products", catalogAdminController.listCatalogProductsHandler);
  router.get("/admin/catalog/products/:productId", catalogAdminController.getCatalogProductHandler);
  router.post("/admin/catalog/products", catalogAdminController.createCatalogProductHandler);
  router.patch("/admin/catalog/products/:productId", catalogAdminController.updateCatalogProductHandler);
  router.get("/admin/catalog/taxonomies", catalogAdminController.listTaxonomiesHandler);
  router.post("/admin/catalog/taxonomies", catalogAdminController.createTaxonomyHandler);
  router.patch("/admin/catalog/taxonomies/:id", catalogAdminController.updateTaxonomyHandler);
  router.delete("/admin/catalog/taxonomies/:id", catalogAdminController.deleteTaxonomyHandler);
  router.get("/admin/branches", branchesController.listBranchesHandler);
  router.post("/admin/branches", branchesController.createBranchHandler);
  router.patch("/admin/branches/:id", branchesController.updateBranchHandler);
  router.delete("/admin/branches/:id", branchesController.deleteBranchHandler);
  router.get("/admin/orders", orderFulfillmentController.listAdminOrdersHandler);
  router.get("/admin/orders/:orderId", orderFulfillmentController.getAdminOrderHandler);
  router.post("/admin/orders/:orderId/status", orderFulfillmentController.transitionOrderStatusHandler);
  router.post("/admin/orders/expire", orderFulfillmentController.runExpirationSweepHandler);
  router.get("/admin/users", usersController.listUsersHandler);
  router.get("/admin/users/:id", usersController.getUserHandler);
  router.post("/admin/users", usersController.createUserHandler);
  router.patch("/admin/users/:id", usersController.updateUserHandler);
  router.delete("/admin/users/:id", usersController.deleteUserHandler);
  router.get("/admin/users/:id/addresses", usersController.listAddressesHandler);
  router.post("/admin/users/:id/addresses", usersController.createAddressHandler);
  router.patch("/admin/users/:id/addresses/:addressId", usersController.updateAddressHandler);
  router.delete("/admin/users/:id/addresses/:addressId", usersController.deleteAddressHandler);

  return router;
}

export default createProtectedRoutes;
