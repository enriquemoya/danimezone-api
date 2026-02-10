import type { CatalogRepository } from "../ports";

export type CatalogUseCases = {
  getCatalogFilters: () => Promise<{ categories: Array<{ id: string; label: string }>; games: Array<{ id: string; label: string }> }>;
  getFeaturedCatalog: () => Promise<{ items: Array<Record<string, unknown>>; meta: { total: number } }>;
  listGames: () => Promise<Array<Record<string, unknown>>>;
  listCategories: (params: {
    gameId?: string | "misc" | null;
    expansionId?: string | null;
  }) => Promise<Array<Record<string, unknown>>>;
  listExpansions: (params: { gameId?: string | null }) => Promise<Array<Record<string, unknown>>>;
};

export function createCatalogUseCases(deps: { catalogRepository: CatalogRepository }): CatalogUseCases {
  return {
    getCatalogFilters: () => deps.catalogRepository.getCatalogFilters(),
    getFeaturedCatalog: () => deps.catalogRepository.getFeaturedCatalog(),
    listGames: () => deps.catalogRepository.listGames(),
    listCategories: (params) => deps.catalogRepository.listCategories(params),
    listExpansions: (params) => deps.catalogRepository.listExpansions(params)
  };
}
