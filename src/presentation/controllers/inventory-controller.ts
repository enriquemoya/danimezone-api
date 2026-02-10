import type { Request, Response } from "express";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { InventoryUseCases } from "../../application/use-cases/inventory";
import { isPositiveNumber, parsePage } from "../../validation/common";
import { validateInventoryAdjustment } from "../../validation/inventory";

export function createInventoryController(useCases: InventoryUseCases) {
  return {
    async listInventoryHandler(req: Request, res: Response) {
      const page = parsePage(req.query.page, 1);
      const pageSize = parsePage(req.query.pageSize, 25);
      const query = typeof req.query.query === "string" ? req.query.query : undefined;
      const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;
      const direction = req.query.direction === "asc" ? "asc" : "desc";
      const allowedSizes = new Set([20, 50, 100]);

      if (!isPositiveNumber(page) || !isPositiveNumber(pageSize) || !allowedSizes.has(pageSize)) {
        res.status(ApiErrors.adminPaginationInvalid.status).json({ error: ApiErrors.adminPaginationInvalid.message });
        return;
      }

      try {
        const result = await useCases.listInventory({
          page,
          pageSize,
          query,
          sort: sort === "available" || sort === "name" ? sort : "updatedAt",
          direction
        });
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
    async adjustInventoryHandler(req: Request, res: Response) {
      const productId = String(req.params.productId || "");
      const actorUserId = (req as Request & { auth?: { userId: string } }).auth?.userId;

      if (!actorUserId) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const payload = validateInventoryAdjustment(req.body ?? {});
        const result = await useCases.adjustInventory({
          productId,
          delta: payload.delta,
          reason: payload.reason,
          actorUserId
        });

        if (!result) {
          res.status(ApiErrors.inventoryNotFound.status).json({ error: ApiErrors.inventoryNotFound.message });
          return;
        }

        res.status(200).json({ item: result.item, adjustment: result.adjustment });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.inventoryInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
