import type { Request, Response } from "express";

import { ApiErrors, asApiError } from "../../errors/api-error";
import { isUuid } from "../../validation/common";
import type { CatalogUseCases } from "../../application/use-cases/catalog";

export function createCatalogController(useCases: CatalogUseCases) {
  return {
    async getCatalogFiltersHandler(_req: Request, res: Response) {
      try {
        const result = await useCases.getCatalogFilters();
        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json(result);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async listGamesHandler(_req: Request, res: Response) {
      try {
        const items = await useCases.listGames();
        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ items });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async listCategoriesHandler(req: Request, res: Response) {
      try {
        const rawGameId = req.query.gameId ? String(req.query.gameId) : null;
        const gameId = rawGameId === "misc" ? "misc" : rawGameId;
        const expansionId = req.query.expansionId ? String(req.query.expansionId) : null;
        if (gameId && gameId !== "misc" && !isUuid(gameId)) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }
        if (expansionId && !isUuid(expansionId)) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }
        if (gameId === "misc" && expansionId) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }
        const items = await useCases.listCategories({ gameId, expansionId });
        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ items });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async listExpansionsHandler(req: Request, res: Response) {
      try {
        const gameId = req.query.gameId ? String(req.query.gameId) : null;
        if (gameId && !isUuid(gameId)) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }
        const items = await useCases.listExpansions({ gameId });
        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ items });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async getFeaturedCatalogHandler(_req: Request, res: Response) {
      try {
        const result = await useCases.getFeaturedCatalog();
        res.status(200).json(result);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
