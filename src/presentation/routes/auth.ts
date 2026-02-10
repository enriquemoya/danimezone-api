import { Router } from "express";

import type { AuthUseCases } from "../../application/use-cases/auth";
import { createAuthController } from "../controllers/auth-controller";

export function createAuthRoutes(authUseCases: AuthUseCases) {
  const router = Router();
  const controller = createAuthController(authUseCases);

  router.post("/auth/magic-link/request", controller.requestMagicLinkHandler);
  router.post("/auth/magic-link/verify", controller.verifyMagicLinkHandler);
  router.post("/auth/password/login", controller.passwordLoginHandler);
  router.post("/auth/refresh", controller.refreshTokenHandler);
  router.post("/auth/logout", controller.logoutHandler);

  return router;
}

export default createAuthRoutes;
