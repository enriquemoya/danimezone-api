import { Router } from "express";

import type { AuthUseCases } from "../../application/use-cases/auth";
import type { BranchUseCases } from "../../application/use-cases/branches";
import type { CatalogUseCases } from "../../application/use-cases/catalog";
import { createBranchesController } from "../controllers/branches-controller";
import { createCatalogController } from "../controllers/catalog-controller";
import { createAuthRoutes } from "./auth";

export function createPublicRoutes(params: {
  catalogUseCases: CatalogUseCases;
  authUseCases: AuthUseCases;
  branchUseCases: BranchUseCases;
}) {
  const router = Router();
  const catalogController = createCatalogController(params.catalogUseCases);
  const branchesController = createBranchesController(params.branchUseCases);

  router.get("/api/cloud/catalog/filters", catalogController.getCatalogFiltersHandler);
  router.get("/catalog/taxonomies/games", catalogController.listGamesHandler);
  router.get("/catalog/taxonomies/categories", catalogController.listCategoriesHandler);
  router.get("/catalog/taxonomies/expansions", catalogController.listExpansionsHandler);
  router.get("/branches", branchesController.listBranchesHandler);
  router.use(createAuthRoutes(params.authUseCases));

  return router;
}

export default createPublicRoutes;
