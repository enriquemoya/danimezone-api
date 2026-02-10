import type { InventoryRepository } from "../ports";

export type InventoryUseCases = {
  listInventory: (params: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: "updatedAt" | "available" | "name";
    direction?: "asc" | "desc";
  }) => Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  adjustInventory: (params: {
    productId: string;
    delta: number;
    reason: string;
    actorUserId: string;
  }) => Promise<{ item: Record<string, unknown>; adjustment: Record<string, unknown> } | null>;
};

export function createInventoryUseCases(deps: { inventoryRepository: InventoryRepository }): InventoryUseCases {
  return {
    listInventory: (params) => deps.inventoryRepository.listInventory(params),
    adjustInventory: (params) => deps.inventoryRepository.adjustInventory(params)
  };
}
