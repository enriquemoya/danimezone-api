import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { ProfileUseCases } from "../../application/use-cases/profile";
import { validatePasswordUpdate, validateProfileUpdate } from "../../validation/profile";

type AuthRequest = Request & { auth?: { userId: string; role: string } };

function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return ApiErrors.userNotFound;
    }
  }
  return null;
}

export function createProfileController(useCases: ProfileUseCases) {
  return {
    async getProfileHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const profile = await useCases.getProfile(auth.userId);
        if (!profile) {
          res.status(ApiErrors.userNotFound.status).json({ error: ApiErrors.userNotFound.message });
          return;
        }
        res.status(200).json(profile);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async updateProfileHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const payload = validateProfileUpdate(req.body ?? {});
        const profile = await useCases.updateProfile(auth.userId, payload);
        res.status(200).json(profile);
      } catch (error) {
        const prismaError = mapPrismaError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.invalidRequest);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async updatePasswordHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const payload = validatePasswordUpdate(req.body ?? {});
        await useCases.updatePassword(auth.userId, payload.password);
        res.status(200).json({ status: "ok" });
      } catch (error) {
        const prismaError = mapPrismaError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.invalidRequest);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
