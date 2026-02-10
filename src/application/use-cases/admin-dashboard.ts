import type { AdminDashboardRepository } from "../ports";

export type AdminDashboardUseCases = {
  getAdminSummary: () => Promise<{ pendingShipments: number; onlineSalesTotal: number; currency: string }>;
};

export function createAdminDashboardUseCases(deps: {
  adminDashboardRepository: AdminDashboardRepository;
}): AdminDashboardUseCases {
  return {
    getAdminSummary: () => deps.adminDashboardRepository.getAdminSummary()
  };
}
