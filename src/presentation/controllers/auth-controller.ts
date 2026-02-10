import type { Request, Response } from "express";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { AuthUseCases } from "../../application/use-cases/auth";
import {
  validateEmailPayload,
  validatePasswordLoginPayload,
  validateRefreshPayload,
  validateTokenPayload
} from "../../validation/auth";

export function createAuthController(useCases: AuthUseCases) {
  return {
    async requestMagicLinkHandler(req: Request, res: Response) {
      try {
        const email = validateEmailPayload(req.body ?? {});
        const locale = typeof req.body?.locale === "string" ? req.body.locale : "es";
        await useCases.requestMagicLink(email, locale);
        res.status(200).json({ status: "ok" });
      } catch (error) {
        console.error("Magic link request failed.", error);
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async verifyMagicLinkHandler(req: Request, res: Response) {
      try {
        const token = validateTokenPayload(req.body ?? {});
        const result = await useCases.verifyMagicLink(token);
        if (!result) {
          res.status(400).json({ error: ApiErrors.invalidRequest.message });
          return;
        }
        res.status(200).json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.invalidRequest);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async refreshTokenHandler(req: Request, res: Response) {
      try {
        const token = validateRefreshPayload(req.body ?? {});
        const result = await useCases.refreshTokens(token);
        if (!result) {
          res.status(401).json({ error: ApiErrors.unauthorized.message });
          return;
        }
        res.status(200).json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.unauthorized);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async logoutHandler(req: Request, res: Response) {
      try {
        const token = validateRefreshPayload(req.body ?? {});
        await useCases.revokeRefreshToken(token);
        res.status(200).json({ status: "ok" });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.invalidRequest);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async passwordLoginHandler(req: Request, res: Response) {
      try {
        const payload = validatePasswordLoginPayload(req.body ?? {});
        const result = await useCases.loginWithPassword(payload.email, payload.password);
        if (!result) {
          res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
          return;
        }
        res.status(200).json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.invalidRequest);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
