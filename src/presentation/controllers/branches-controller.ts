import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { BranchUseCases } from "../../application/use-cases/branches";
import { validateBranchCreate, validateBranchUpdate } from "../../validation/checkout";

function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return ApiErrors.branchNotFound;
    }
  }
  return null;
}

export function createBranchesController(useCases: BranchUseCases) {
  return {
    async listBranchesHandler(req: Request, res: Response) {
      try {
        const items = await useCases.listBranches();
        res.status(200).json({ items });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async createBranchHandler(req: Request, res: Response) {
      try {
        const payload = validateBranchCreate(req.body ?? {});
        const branch = await useCases.createBranch(payload);
        res.status(201).json({ branch });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.checkoutInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async updateBranchHandler(req: Request, res: Response) {
      try {
        const payload = validateBranchUpdate(req.body ?? {});
        const branch = await useCases.updateBranch(String(req.params.id), payload);
        if (!branch) {
          res.status(ApiErrors.branchNotFound.status).json({ error: ApiErrors.branchNotFound.message });
          return;
        }
        res.status(200).json({ branch });
      } catch (error) {
        const prismaError = mapPrismaError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.checkoutInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async deleteBranchHandler(req: Request, res: Response) {
      try {
        const branch = await useCases.deleteBranch(String(req.params.id));
        if (!branch) {
          res.status(ApiErrors.branchNotFound.status).json({ error: ApiErrors.branchNotFound.message });
          return;
        }
        res.status(200).json({ branch });
      } catch (error) {
        const prismaError = mapPrismaError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
