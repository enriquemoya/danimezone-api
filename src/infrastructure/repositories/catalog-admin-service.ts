import crypto from "crypto";

import { CatalogAction, CatalogEntityType, CatalogTaxonomyType, Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";
import { ApiErrors } from "../../errors/api-error";

type SortDirection = "asc" | "desc";

type ProductSort = "updatedAt" | "name" | "price";

type TaxonomySort = "name" | "type";

function createCatalogAuditLog(params: {
  entityType: CatalogEntityType;
  entityId: string;
  action: CatalogAction;
  actorUserId: string;
  reason: string;
  payload?: Record<string, unknown> | null;
}) {
  return prisma.catalogAuditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorUserId: params.actorUserId,
      reason: params.reason,
      payload: (params.payload ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
    }
  });
}

async function resolveGameTaxonomy(params: { gameId?: string | null; game?: string | null }) {
  const gameId = params.gameId ?? null;
  if (gameId) {
    const game = await prisma.catalogTaxonomy.findFirst({
      where: { id: gameId, type: CatalogTaxonomyType.GAME }
    });
    if (!game) {
      throw ApiErrors.taxonomyNotFound;
    }
    return game;
  }

  const gameValue = (params.game ?? "").trim();
  if (!gameValue) {
    return null;
  }

  const slugCandidate = gameValue.toLowerCase();
  if (slugCandidate === "misc") {
    return null;
  }
  const game = await prisma.catalogTaxonomy.findFirst({
    where: {
      type: CatalogTaxonomyType.GAME,
      OR: [
        { slug: slugCandidate },
        { name: { equals: gameValue, mode: Prisma.QueryMode.insensitive } }
      ]
    }
  });
  if (!game) {
    throw ApiErrors.taxonomyNotFound;
  }

  return game;
}

export async function listCatalogProducts(params: {
  page: number;
  pageSize: number;
  query?: string;
  sort?: ProductSort;
  direction?: SortDirection;
}) {
  const skip = (params.page - 1) * params.pageSize;
  const query = params.query?.trim();
  const where = query
    ? {
        OR: [
          { displayName: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { slug: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { category: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { game: { contains: query, mode: Prisma.QueryMode.insensitive } }
        ]
      }
    : undefined;

  const direction = params.direction ?? "desc";
  const orderBy =
    params.sort === "name"
      ? { displayName: direction }
      : params.sort === "price"
        ? { price: direction }
        : { updatedAt: direction };

  const [items, total] = await prisma.$transaction([
    prisma.readModelInventory.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      select: {
        productId: true,
        displayName: true,
        slug: true,
        category: true,
        categoryId: true,
        game: true,
        gameId: true,
        expansionId: true,
        price: true,
        imageUrl: true,
        shortDescription: true,
        availabilityState: true,
        isFeatured: true,
        featuredOrder: true,
        available: true
      }
    }),
    prisma.readModelInventory.count({ where })
  ]);

  return { items, total };
}

export async function getCatalogProduct(productId: string) {
  return prisma.readModelInventory.findUnique({
    where: { productId }
  });
}

export async function createCatalogProduct(params: {
  actorUserId: string;
  reason: string;
  name: string;
  slug: string;
  game?: string | null;
  gameId: string | null;
  categoryId: string;
  expansionId: string | null;
  price: number;
  imageUrl: string;
  description: string | null;
  rarity: string | null;
  tags: string[] | null;
  availabilityState: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "PENDING_SYNC";
  isActive: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
}) {
  const existingSlug = await prisma.readModelInventory.findFirst({
    where: { slug: params.slug }
  });
  if (existingSlug) {
    throw ApiErrors.productSlugExists;
  }

  const category = await prisma.catalogTaxonomy.findFirst({
    where: { id: params.categoryId, type: CatalogTaxonomyType.CATEGORY }
  });
  if (!category) {
    throw ApiErrors.taxonomyNotFound;
  }

  const game = await resolveGameTaxonomy({ gameId: params.gameId ?? null, game: params.game ?? null });

  const expansion = params.expansionId
    ? await prisma.catalogTaxonomy.findFirst({
        where: { id: params.expansionId, type: CatalogTaxonomyType.EXPANSION }
      })
    : null;
  if (params.expansionId && !expansion) {
    throw ApiErrors.taxonomyNotFound;
  }
  if (expansion && !game) {
    throw ApiErrors.productInvalid;
  }
  if (expansion && expansion.parentId !== game?.id) {
    throw ApiErrors.productInvalid;
  }

  const productId = crypto.randomUUID();
  const availabilityState = params.availabilityState;

  const [product] = await prisma.$transaction([
    prisma.readModelInventory.create({
      data: {
        productId,
        displayName: params.name,
        slug: params.slug,
        category: category.name,
        categoryId: category.id,
        gameId: game?.id ?? null,
        expansionId: expansion?.id ?? null,
        game: game?.slug ?? "misc",
        price: params.price,
        imageUrl: params.imageUrl,
        shortDescription: params.description,
        description: params.description,
        rarity: params.rarity,
        tags: (params.tags ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
        isActive: params.isActive,
        isFeatured: params.isFeatured,
        featuredOrder: params.featuredOrder,
        availabilityState,
        available: 0
      }
    }),
    createCatalogAuditLog({
      entityType: CatalogEntityType.PRODUCT,
      entityId: productId,
      action: CatalogAction.CREATE,
      actorUserId: params.actorUserId,
      reason: params.reason,
      payload: {
        name: params.name,
        slug: params.slug,
        categoryId: params.categoryId,
        gameId: params.gameId,
        expansionId: params.expansionId,
        game: game?.slug ?? "misc"
      }
    })
  ]);

  return product;
}

export async function updateCatalogProduct(params: {
  productId: string;
  data: Record<string, unknown>;
  actorUserId: string;
  reason: string;
}) {
  const updateData = { ...params.data };
  const current = await prisma.readModelInventory.findUnique({
    where: { productId: params.productId },
    select: { gameId: true, expansionId: true, categoryId: true }
  });
  if (!current) {
    throw ApiErrors.productNotFound;
  }

  if (typeof updateData.slug === "string") {
    const existingSlug = await prisma.readModelInventory.findFirst({
      where: { slug: updateData.slug, NOT: { productId: params.productId } }
    });
    if (existingSlug) {
      throw ApiErrors.productSlugExists;
    }
  }

  if (typeof updateData.categoryId === "string") {
    const category = await prisma.catalogTaxonomy.findFirst({
      where: { id: updateData.categoryId, type: CatalogTaxonomyType.CATEGORY }
    });
    if (!category) {
      throw ApiErrors.taxonomyNotFound;
    }
    updateData.category = category.name;
  }

  let gameId: string | null = current.gameId ?? null;
  if (Object.prototype.hasOwnProperty.call(updateData, "gameId")) {
    if (typeof updateData.gameId === "string") {
      const game = await resolveGameTaxonomy({ gameId: updateData.gameId, game: null });
      gameId = game?.id ?? null;
      updateData.game = game?.slug ?? "misc";
      updateData.gameId = game?.id ?? null;
    } else if (updateData.gameId === null) {
      gameId = null;
      updateData.game = "misc";
    }
  } else if (Object.prototype.hasOwnProperty.call(updateData, "game")) {
    if (updateData.game === null) {
      gameId = null;
      updateData.game = "misc";
      updateData.gameId = null;
    } else if (typeof updateData.game === "string") {
      const gameValue = updateData.game.trim();
      if (!gameValue) {
        gameId = null;
        updateData.game = "misc";
        updateData.gameId = null;
      } else {
        const game = await resolveGameTaxonomy({ game: gameValue, gameId: null });
        gameId = game?.id ?? null;
        updateData.game = game?.slug ?? "misc";
        updateData.gameId = game?.id ?? null;
      }
    }
  }

  let expansionId: string | null = current.expansionId ?? null;
  if (typeof updateData.expansionId === "string") {
    const expansion = await prisma.catalogTaxonomy.findFirst({
      where: { id: updateData.expansionId, type: CatalogTaxonomyType.EXPANSION }
    });
    if (!expansion) {
      throw ApiErrors.taxonomyNotFound;
    }
    expansionId = expansion.id;
    if (!gameId || expansion.parentId !== gameId) {
      throw ApiErrors.productInvalid;
    }
  } else if (updateData.expansionId === null) {
    expansionId = null;
  }

  if (!gameId && expansionId) {
    throw ApiErrors.productInvalid;
  }

  const [product] = await prisma.$transaction([
    prisma.readModelInventory.update({
      where: { productId: params.productId },
      data: updateData
    }),
    createCatalogAuditLog({
      entityType: CatalogEntityType.PRODUCT,
      entityId: params.productId,
      action: CatalogAction.UPDATE,
      actorUserId: params.actorUserId,
      reason: params.reason,
      payload: updateData
    })
  ]);

  return product;
}

export async function listTaxonomies(params: {
  type?: CatalogTaxonomyType;
  page: number;
  pageSize: number;
  query?: string;
  sort?: TaxonomySort;
  direction?: SortDirection;
}) {
  const skip = (params.page - 1) * params.pageSize;
  const query = params.query?.trim();
  const where = {
    ...(params.type ? { type: params.type } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { slug: { contains: query, mode: Prisma.QueryMode.insensitive } }
          ]
        }
      : {})
  };

  const direction = params.direction ?? "asc";
  const orderBy = params.sort === "type" ? { type: direction } : { name: direction };

  const [items, total] = await prisma.$transaction([
    prisma.catalogTaxonomy.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize
    }),
    prisma.catalogTaxonomy.count({ where })
  ]);

  return { items, total };
}

export async function createTaxonomy(data: {
  type: CatalogTaxonomyType;
  name: string;
  slug: string;
  description: string | null;
  parentId?: string | null;
  releaseDate?: Date | null;
  labels?: { es: string | null; en: string | null } | null;
}) {
  if (data.type === CatalogTaxonomyType.EXPANSION) {
    if (!data.parentId) {
      throw ApiErrors.taxonomyInvalid;
    }
    const parent = await prisma.catalogTaxonomy.findFirst({
      where: { id: data.parentId, type: CatalogTaxonomyType.GAME }
    });
    if (!parent) {
      throw ApiErrors.taxonomyInvalid;
    }
    if (!data.releaseDate) {
      throw ApiErrors.taxonomyInvalid;
    }
  } else if (data.type === CatalogTaxonomyType.CATEGORY) {
    if (data.parentId) {
      const parent = await prisma.catalogTaxonomy.findFirst({
        where: {
          id: data.parentId,
          type: { in: [CatalogTaxonomyType.GAME, CatalogTaxonomyType.EXPANSION] }
        }
      });
      if (!parent) {
        throw ApiErrors.taxonomyInvalid;
      }
    }
  } else if (data.parentId) {
    throw ApiErrors.taxonomyInvalid;
  }

  return prisma.catalogTaxonomy.create({
    data: {
      type: data.type,
      name: data.name,
      slug: data.slug,
      description: data.description,
      parentId: data.parentId ?? null,
      releaseDate: data.releaseDate ?? null,
      labels: (data.labels ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
    }
  });
}

export async function updateTaxonomy(id: string, data: {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  releaseDate?: Date | null;
  labels?: { es: string | null; en: string | null } | null;
}) {
  const current = await prisma.catalogTaxonomy.findUnique({
    where: { id },
    select: { type: true, releaseDate: true }
  });
  if (!current) {
    throw ApiErrors.taxonomyNotFound;
  }

  if (Object.prototype.hasOwnProperty.call(data, "parentId")) {
    if (
      (current.type === CatalogTaxonomyType.GAME || current.type === CatalogTaxonomyType.OTHER) &&
      data.parentId
    ) {
      throw ApiErrors.taxonomyInvalid;
    }
    if (current.type === CatalogTaxonomyType.EXPANSION) {
      if (!data.parentId) {
        throw ApiErrors.taxonomyInvalid;
      }
      const parent = await prisma.catalogTaxonomy.findFirst({
        where: { id: data.parentId, type: CatalogTaxonomyType.GAME }
      });
      if (!parent) {
        throw ApiErrors.taxonomyInvalid;
      }
      if (Object.prototype.hasOwnProperty.call(data, "releaseDate") && !data.releaseDate) {
        throw ApiErrors.taxonomyInvalid;
      }
    } else if (current.type === CatalogTaxonomyType.CATEGORY && data.parentId) {
      const parent = await prisma.catalogTaxonomy.findFirst({
        where: {
          id: data.parentId,
          type: { in: [CatalogTaxonomyType.GAME, CatalogTaxonomyType.EXPANSION] }
        }
      });
      if (!parent) {
        throw ApiErrors.taxonomyInvalid;
      }
    }
  }
  if (
    current.type !== CatalogTaxonomyType.EXPANSION &&
    Object.prototype.hasOwnProperty.call(data, "releaseDate") &&
    data.releaseDate
  ) {
    throw ApiErrors.taxonomyInvalid;
  }

  return prisma.catalogTaxonomy.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      parentId: Object.prototype.hasOwnProperty.call(data, "parentId")
        ? data.parentId ?? null
        : undefined,
      releaseDate: Object.prototype.hasOwnProperty.call(data, "releaseDate")
        ? data.releaseDate ?? null
        : undefined,
      labels: Object.prototype.hasOwnProperty.call(data, "labels")
        ? ((data.labels ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput)
        : undefined
    }
  });
}

export async function deleteTaxonomy(id: string) {
  return prisma.catalogTaxonomy.delete({ where: { id } });
}
