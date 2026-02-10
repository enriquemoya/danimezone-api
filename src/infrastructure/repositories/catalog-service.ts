import { prisma } from "../db/prisma";

const LOW_STOCK_THRESHOLD = 3;

function logIgnoredTaxonomyRelation(params: {
  productId?: string | null;
  expansionId?: string | null;
  expectedGameId?: string | null;
  actualGameId?: string | null;
  source: string;
}) {
  try {
    console.warn({
      level: "warn",
      event: "taxonomy_relation_ignored",
      productId: params.productId ?? null,
      expansionId: params.expansionId ?? null,
      expectedGameId: params.expectedGameId ?? null,
      actualGameId: params.actualGameId ?? null,
      source: params.source
    });
  } catch {
    // Logging must never block public reads.
  }
}

type TaxonomyLabels = {
  es: string | null;
  en: string | null;
};

function normalizeLabels(value: unknown): TaxonomyLabels {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { es: null, en: null };
  }
  const record = value as Record<string, unknown>;
  return {
    es: typeof record.es === "string" ? record.es : null,
    en: typeof record.en === "string" ? record.en : null
  };
}

export async function getCatalogFilters() {
  const [categories, games] = await prisma.$transaction([
    prisma.catalogTaxonomy.findMany({
      where: { type: "CATEGORY" },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.catalogTaxonomy.findMany({
      where: { type: "GAME" },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  return {
    categories: categories.map((item) => ({ id: item.id, label: item.name })),
    games: games.map((item) => ({ id: item.id, label: item.name }))
  };
}

export async function listGames() {
  const items = await prisma.catalogTaxonomy.findMany({
    where: { type: "GAME" },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, labels: true, releaseDate: true }
  });
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    type: "GAME",
    name: item.name,
    labels: normalizeLabels(item.labels),
    parentId: null,
    releaseDate: item.releaseDate?.toISOString().slice(0, 10) ?? null
  }));
}

export async function listCategories(params: {
  gameId?: string | "misc" | null;
  expansionId?: string | null;
}) {
  const where =
    params.gameId === "misc"
      ? {
          type: "CATEGORY" as const,
          parentId: null
        }
      : params.expansionId
        ? {
            type: "CATEGORY" as const,
            OR: [
              { parentId: params.expansionId },
              ...(params.gameId ? [{ parentId: params.gameId }] : [])
            ]
          }
        : params.gameId
          ? {
              type: "CATEGORY" as const,
              OR: [
                { parentId: params.gameId },
                {
                  parent: {
                    type: "EXPANSION" as const,
                    parentId: params.gameId
                  }
                }
              ]
            }
          : {
              type: "CATEGORY" as const
            };

  const items = await prisma.catalogTaxonomy.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, labels: true, parentId: true, releaseDate: true }
  });
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    type: "CATEGORY",
    name: item.name,
    labels: normalizeLabels(item.labels),
    parentId: item.parentId ?? null,
    releaseDate: item.releaseDate?.toISOString().slice(0, 10) ?? null
  }));
}

export async function listExpansions(params: { gameId?: string | null }) {
  const items = await prisma.catalogTaxonomy.findMany({
    where: {
      type: "EXPANSION",
      ...(params.gameId ? { parentId: params.gameId } : {})
    },
    orderBy: [{ releaseDate: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      labels: true,
      parentId: true,
      releaseDate: true,
      parent: {
        select: {
          id: true,
          type: true,
          parentId: true
        }
      }
    }
  });

  const validItems = items.filter((item) => {
    const isValid = item.parent?.type === "GAME";
    if (!isValid) {
      logIgnoredTaxonomyRelation({
        expansionId: item.id,
        expectedGameId: params.gameId ?? null,
        actualGameId: item.parent?.type === "GAME" ? item.parent.id : item.parent?.parentId ?? null,
        source: "catalog/taxonomies/expansions"
      });
    }
    return isValid;
  });

  return validItems.map((item) => ({
    id: item.id,
    slug: item.slug,
    type: "EXPANSION",
    name: item.name,
    labels: normalizeLabels(item.labels),
    parentId: item.parentId ?? null,
    releaseDate: item.releaseDate?.toISOString().slice(0, 10) ?? null
  }));
}

export async function getFeaturedCatalog() {
  const [ordered, fallback, total] = await prisma.$transaction([
    prisma.readModelInventory.findMany({
      where: { isFeatured: true, featuredOrder: { not: null } },
      orderBy: [{ featuredOrder: "asc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        productId: true,
        slug: true,
        displayName: true,
        imageUrl: true,
        category: true,
        available: true,
        featuredOrder: true,
        price: true,
        game: true
      }
    }),
    prisma.readModelInventory.findMany({
      where: { isFeatured: true, featuredOrder: null },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        productId: true,
        slug: true,
        displayName: true,
        imageUrl: true,
        category: true,
        available: true,
        featuredOrder: true,
        price: true,
        game: true
      }
    }),
    prisma.readModelInventory.count({ where: { isFeatured: true } })
  ]);

  const items = [...ordered, ...fallback].slice(0, 12).map((row) => {
    const availability =
      row.available <= 0
        ? "out_of_stock"
        : row.available <= LOW_STOCK_THRESHOLD
          ? "low_stock"
          : "in_stock";

    return {
      id: row.productId,
      slug: row.slug ?? null,
      name: row.displayName ?? null,
      game: row.game ?? "other",
      imageUrl: row.imageUrl ?? null,
      price: row.price ?? null,
      currency: "MXN",
      availability,
      featuredOrder: row.featuredOrder ?? null
    };
  });

  return { items, meta: { total } };
}
