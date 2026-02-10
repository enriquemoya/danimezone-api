import type { Request, Response } from "express";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { AdminDashboardUseCases } from "../../application/use-cases/admin-dashboard";

export function createAdminDashboardController(useCases: AdminDashboardUseCases) {
  return {
    async getAdminSummaryHandler(_req: Request, res: Response) {
      try {
        const summary = await useCases.getAdminSummary();
        res.status(200).json(summary);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
