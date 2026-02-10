import type { SyncRepository } from "../ports";

export type SyncUseCases = {
  recordEvents: (events: any[]) => Promise<{ accepted: string[]; duplicates: string[] }>;
  getPendingEvents: (posId: string, since: string | null) => Promise<any[]>;
  acknowledgeEvents: (posId: string, eventIds: string[]) => Promise<void>;
  createOrder: (orderId: string, items: any[]) => Promise<{ duplicate: boolean }>;
  readProducts: (params: {
    page: number;
    pageSize: number;
    id: string | null;
    gameId?: string | "misc" | null;
    categoryId?: string | null;
    expansionId?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
  }) => Promise<{ items: any[]; total: number }>;
};

export function createSyncUseCases(deps: { syncRepository: SyncRepository }): SyncUseCases {
  return {
    recordEvents: (events) => deps.syncRepository.recordEvents(events),
    getPendingEvents: (posId, since) => deps.syncRepository.getPendingEvents(posId, since),
    acknowledgeEvents: (posId, eventIds) => deps.syncRepository.acknowledgeEvents(posId, eventIds),
    createOrder: (orderId, items) => deps.syncRepository.createOrder(orderId, items),
    readProducts: (params) => deps.syncRepository.readProducts(params)
  };
}
