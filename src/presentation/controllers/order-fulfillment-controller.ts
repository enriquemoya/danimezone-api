import type { Request, Response } from "express";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { OrderFulfillmentUseCases } from "../../application/use-cases/order-fulfillment";
import { validateOrderListQuery, validateTransitionBody } from "../../validation/order-fulfillment";

type AuthRequest = Request & { auth?: { userId: string; role: string } };

export function createOrderFulfillmentController(useCases: OrderFulfillmentUseCases) {
  return {
    async listAdminOrdersHandler(req: Request, res: Response) {
      try {
        const query = validateOrderListQuery(req.query as Record<string, unknown>);
        const result = await useCases.listAdminOrders({
          page: query.page,
          pageSize: query.pageSize,
          query: query.query,
          status: query.status,
          sort: query.sort,
          direction: query.direction
        });
        res.status(200).json({
          items: result.items,
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          hasMore: query.page * query.pageSize < result.total
        });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async getAdminOrderHandler(req: Request, res: Response) {
      try {
        const orderId = String(req.params.orderId || "").trim();
        if (!orderId) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }

        const order = await useCases.getAdminOrder({ orderId });
        if (!order) {
          res.status(ApiErrors.checkoutOrderNotFound.status).json({ error: ApiErrors.checkoutOrderNotFound.message });
          return;
        }

        res.status(200).json({ order });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async transitionOrderStatusHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const orderId = String(req.params.orderId || "").trim();
        if (!orderId) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }

        const payload = validateTransitionBody(req.body ?? {});
        const result = await useCases.transitionOrderStatus({
          orderId,
          toStatus: payload.toStatus,
          actorUserId: auth.userId,
          reason: payload.reason
        });
        res.status(200).json(result);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async listCustomerOrdersHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const query = validateOrderListQuery(req.query as Record<string, unknown>);
        const result = await useCases.listCustomerOrders({
          userId: auth.userId,
          page: query.page,
          pageSize: query.pageSize
        });
        res.status(200).json({
          items: result.items,
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          hasMore: query.page * query.pageSize < result.total
        });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async getCustomerOrderHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const orderId = String(req.params.orderId || "").trim();
        if (!orderId) {
          res.status(ApiErrors.invalidRequest.status).json({ error: ApiErrors.invalidRequest.message });
          return;
        }

        const order = await useCases.getCustomerOrder({ userId: auth.userId, orderId });
        if (!order) {
          res.status(ApiErrors.checkoutOrderNotFound.status).json({ error: ApiErrors.checkoutOrderNotFound.message });
          return;
        }
        res.status(200).json({ order });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async runExpirationSweepHandler(_req: Request, res: Response) {
      try {
        const result = await useCases.runExpirationSweep();
        res.status(200).json(result);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
