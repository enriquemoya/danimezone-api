import type { Request, Response } from "express";
import { Prisma, CatalogTaxonomyType } from "@prisma/client";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { CatalogAdminUseCases } from "../../application/use-cases/catalog-admin";
import { isPositiveNumber, parsePage } from "../../validation/common";
import { validateProductCreate, validateProductUpdate, validateTaxonomyCreate, validateTaxonomyUpdate } from "../../validation/catalog";

function mapTaxonomyError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return ApiErrors.taxonomyInvalid;
    }
    if (error.code === "P2025") {
      return ApiErrors.taxonomyNotFound;
    }
  }
  return null;
}

function mapProductError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return ApiErrors.productNotFound;
    }
  }
  return null;
}

function getAuthUserId(req: Request) {
  return (req as Request & { auth?: { userId: string } }).auth?.userId;
}

export function createCatalogAdminController(useCases: CatalogAdminUseCases) {
  return {
    async listCatalogProductsHandler(req: Request, res: Response) {
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
        const result = await useCases.listCatalogProducts({
          page,
          pageSize,
          query,
          sort: sort === "name" || sort === "price" ? sort : "updatedAt",
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
    async getCatalogProductHandler(req: Request, res: Response) {
      const productId = String(req.params.productId || "");
      try {
        const product = await useCases.getCatalogProduct(productId);
        if (!product) {
          res.status(ApiErrors.productNotFound.status).json({ error: ApiErrors.productNotFound.message });
          return;
        }
        res.status(200).json({ product });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async createCatalogProductHandler(req: Request, res: Response) {
      const actorUserId = getAuthUserId(req);
      if (!actorUserId) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const payload = validateProductCreate(req.body ?? {});
        const product = await useCases.createCatalogProduct({
          actorUserId,
          reason: payload.reason,
          name: payload.name,
          slug: payload.slug,
          gameId: payload.gameId,
          categoryId: payload.categoryId,
          expansionId: payload.expansionId,
          price: payload.price,
          imageUrl: payload.imageUrl,
          description: payload.description,
          rarity: payload.rarity,
          tags: payload.tags,
          availabilityState: payload.availabilityState,
          isActive: payload.isActive,
          isFeatured: payload.isFeatured,
          featuredOrder: payload.featuredOrder
        });
        res.status(201).json({ product });
      } catch (error) {
        if (error === ApiErrors.productSlugExists) {
          res.status(ApiErrors.productSlugExists.status).json({ error: ApiErrors.productSlugExists.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.productInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async updateCatalogProductHandler(req: Request, res: Response) {
      const actorUserId = getAuthUserId(req);
      if (!actorUserId) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      const productId = String(req.params.productId || "");
      try {
        const payload = validateProductUpdate(req.body ?? {});
        const product = await useCases.updateCatalogProduct({
          productId,
          data: payload.data,
          actorUserId,
          reason: payload.reason
        });
        res.status(200).json({ product });
      } catch (error) {
        if (error === ApiErrors.productSlugExists) {
          res.status(ApiErrors.productSlugExists.status).json({ error: ApiErrors.productSlugExists.message });
          return;
        }
        const prismaError = mapProductError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.productInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async listTaxonomiesHandler(req: Request, res: Response) {
      const typeParam = typeof req.query.type === "string" ? req.query.type.toUpperCase() : undefined;
      const type = typeParam && ["CATEGORY", "GAME", "EXPANSION", "OTHER"].includes(typeParam)
        ? (typeParam as CatalogTaxonomyType)
        : undefined;
      const page = parsePage(req.query.page, 1);
      const pageSize = parsePage(req.query.pageSize, 25);
      const query = typeof req.query.query === "string" ? req.query.query : undefined;
      const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;
      const direction = req.query.direction === "desc" ? "desc" : "asc";
      const allowedSizes = new Set([20, 50, 100]);

      if (!isPositiveNumber(page) || !isPositiveNumber(pageSize) || !allowedSizes.has(pageSize)) {
        res.status(ApiErrors.adminPaginationInvalid.status).json({ error: ApiErrors.adminPaginationInvalid.message });
        return;
      }

      try {
        const result = await useCases.listTaxonomies({
          type,
          page,
          pageSize,
          query,
          sort: sort === "type" ? "type" : "name",
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
    async createTaxonomyHandler(req: Request, res: Response) {
      try {
        const payload = validateTaxonomyCreate(req.body ?? {});
        const taxonomy = await useCases.createTaxonomy(payload);
        res.status(201).json({ taxonomy });
      } catch (error) {
        const prismaError = mapTaxonomyError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.taxonomyInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async updateTaxonomyHandler(req: Request, res: Response) {
      const id = String(req.params.id || "");
      try {
        const payload = validateTaxonomyUpdate(req.body ?? {});
        const taxonomy = await useCases.updateTaxonomy(id, payload);
        res.status(200).json({ taxonomy });
      } catch (error) {
        const prismaError = mapTaxonomyError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.taxonomyInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async deleteTaxonomyHandler(req: Request, res: Response) {
      const id = String(req.params.id || "");
      try {
        await useCases.deleteTaxonomy(id);
        res.status(200).json({ status: "deleted" });
      } catch (error) {
        const prismaError = mapTaxonomyError(error);
        if (prismaError) {
          res.status(prismaError.status).json({ error: prismaError.message });
          return;
        }
        const apiError = asApiError(error, ApiErrors.taxonomyNotFound);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
