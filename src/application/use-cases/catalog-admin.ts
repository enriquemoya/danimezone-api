import type { CatalogAdminRepository } from "../ports";

export type CatalogAdminUseCases = {
  listCatalogProducts: (params: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: "updatedAt" | "name" | "price";
    direction?: "asc" | "desc";
  }) => Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  getCatalogProduct: (productId: string) => Promise<Record<string, unknown> | null>;
  createCatalogProduct: (params: {
    actorUserId: string;
    reason: string;
    name: string;
    slug: string;
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
  }) => Promise<Record<string, unknown>>;
  updateCatalogProduct: (params: {
    productId: string;
    data: Record<string, unknown>;
    actorUserId: string;
    reason: string;
  }) => Promise<Record<string, unknown>>;
  listTaxonomies: (params: {
    type?: "CATEGORY" | "GAME" | "EXPANSION" | "OTHER";
    page: number;
    pageSize: number;
    query?: string;
    sort?: "name" | "type";
    direction?: "asc" | "desc";
  }) => Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  createTaxonomy: (data: {
    type: "CATEGORY" | "GAME" | "EXPANSION" | "OTHER";
    name: string;
    slug: string;
    description: string | null;
    parentId?: string | null;
    releaseDate?: Date | null;
    labels?: { es: string | null; en: string | null } | null;
  }) => Promise<Record<string, unknown>>;
  updateTaxonomy: (id: string, data: {
    name?: string;
    slug?: string;
    description?: string | null;
    parentId?: string | null;
    releaseDate?: Date | null;
    labels?: { es: string | null; en: string | null } | null;
  }) => Promise<Record<string, unknown>>;
  deleteTaxonomy: (id: string) => Promise<Record<string, unknown>>;
};

export function createCatalogAdminUseCases(deps: { catalogAdminRepository: CatalogAdminRepository }): CatalogAdminUseCases {
  return {
    listCatalogProducts: (params) => deps.catalogAdminRepository.listCatalogProducts(params),
    getCatalogProduct: (productId) => deps.catalogAdminRepository.getCatalogProduct(productId),
    createCatalogProduct: (params) => deps.catalogAdminRepository.createCatalogProduct(params),
    updateCatalogProduct: (params) => deps.catalogAdminRepository.updateCatalogProduct(params),
    listTaxonomies: (params) => deps.catalogAdminRepository.listTaxonomies(params),
    createTaxonomy: (data) => deps.catalogAdminRepository.createTaxonomy(data),
    updateTaxonomy: (id, data) => deps.catalogAdminRepository.updateTaxonomy(id, data),
    deleteTaxonomy: (id) => deps.catalogAdminRepository.deleteTaxonomy(id)
  };
}
