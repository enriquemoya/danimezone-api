import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { UsersUseCases } from "../../application/use-cases/users";
import { isPositiveNumber, parsePage } from "../../validation/common";
import {
  validateAddressCreate,
  validateAddressUpdate,
  validateUserCreate,
  validateUserUpdate
} from "../../validation/users";

function mapPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
      if (target.includes("email")) {
        return ApiErrors.emailExists;
      }
      if (target.includes("phone")) {
        return ApiErrors.phoneExists;
      }
    }
    if (error.code === "P2025") {
      return ApiErrors.userNotFound;
    }
  }
  return null;
}

export function createUsersController(useCases: UsersUseCases) {
  return {
    async listUsersHandler(req: Request, res: Response) {
      const page = parsePage(req.query.page, 1);
      const pageSize = parsePage(req.query.pageSize, 25);

      if (!isPositiveNumber(page) || !isPositiveNumber(pageSize)) {
        res.status(ApiErrors.adminPaginationInvalid.status).json({ error: ApiErrors.adminPaginationInvalid.message });
        return;
      }

      try {
        const result = await useCases.listUsers(page, pageSize);
        res.status(200).json({
          items: result.items,
          page,
          pageSize,
          total: result.total,
          hasMore: page * pageSize < result.total
        });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async getUserHandler(req: Request, res: Response) {
      const id = String(req.params.id || "");
      try {
        const user = await useCases.getUserById(id);
        if (!user) {
          res.status(ApiErrors.userNotFound.status).json({ error: ApiErrors.userNotFound.message });
          return;
        }
        res.status(200).json({ user });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async createUserHandler(req: Request, res: Response) {
      try {
        const payload = validateUserCreate(req.body ?? {});
        const user = await useCases.createUser(payload);
        res.status(201).json({ user });
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
    async updateUserHandler(req: Request, res: Response) {
      const id = String(req.params.id || "");
      try {
        const payload = validateUserUpdate(req.body ?? {});
        const user = await useCases.updateUser(id, payload);
        res.status(200).json({ user });
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
    async deleteUserHandler(req: Request, res: Response) {
      const id = String(req.params.id || "");
      try {
        await useCases.disableUser(id);
        res.status(200).json({ status: "disabled" });
      } catch (error) {
        const prismaError = mapPrismaError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async listAddressesHandler(req: Request, res: Response) {
      const userId = String(req.params.id || "");
      try {
        const user = await useCases.getUserById(userId);
        if (!user) {
          res.status(ApiErrors.userNotFound.status).json({ error: ApiErrors.userNotFound.message });
          return;
        }
        const items = await useCases.listAddresses(userId);
        res.status(200).json({ items });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async createAddressHandler(req: Request, res: Response) {
      const userId = String(req.params.id || "");
      try {
        const user = await useCases.getUserById(userId);
        if (!user) {
          res.status(ApiErrors.userNotFound.status).json({ error: ApiErrors.userNotFound.message });
          return;
        }
        const payload = validateAddressCreate(req.body ?? {});
        const address = await useCases.createAddress(userId, payload);
        res.status(201).json({ address });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.addressInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async updateAddressHandler(req: Request, res: Response) {
      const userId = String(req.params.id || "");
      const addressId = String(req.params.addressId || "");
      try {
        const existing = await useCases.findAddress(addressId, userId);
        if (!existing) {
          res.status(ApiErrors.addressNotFound.status).json({ error: ApiErrors.addressNotFound.message });
          return;
        }
        const payload = validateAddressUpdate(req.body ?? {});
        const address = await useCases.updateAddress(addressId, payload);
        res.status(200).json({ address });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.addressInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async deleteAddressHandler(req: Request, res: Response) {
      const userId = String(req.params.id || "");
      const addressId = String(req.params.addressId || "");
      try {
        const existing = await useCases.findAddress(addressId, userId);
        if (!existing) {
          res.status(ApiErrors.addressNotFound.status).json({ error: ApiErrors.addressNotFound.message });
          return;
        }
        await useCases.deleteAddress(addressId);
        res.status(200).json({ status: "deleted" });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
