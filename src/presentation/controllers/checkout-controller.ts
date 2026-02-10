import type { Request, Response } from "express";

import { ApiErrors, asApiError } from "../../errors/api-error";
import type { CheckoutUseCases } from "../../application/use-cases/checkout";
import { validateCheckoutOrder, validateDraftItems, validateRevalidateItems } from "../../validation/checkout";

type AuthRequest = Request & { auth?: { userId: string; role: string } };

export function createCheckoutController(useCases: CheckoutUseCases) {
  return {
    async createDraftHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const items = validateDraftItems(req.body ?? {});
        const result = await useCases.createDraft({ userId: auth.userId, items });
        res.status(200).json(result);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.checkoutInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async revalidateHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const items = validateRevalidateItems(req.body ?? {});
        const result = await useCases.revalidate({ items });
        res.status(200).json({ validItems: result.items, removedItems: result.removedItems });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.checkoutInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async getActiveDraftHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const draft = await useCases.getActiveDraft({ userId: auth.userId });
        if (!draft) {
          res.status(200).json({ draftId: null, items: [] });
          return;
        }
        res.status(200).json(draft);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async createOrderHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const payload = validateCheckoutOrder(req.body ?? {});
        const order = await useCases.createOrder({
          userId: auth.userId,
          draftId: payload.draftId,
          paymentMethod: payload.paymentMethod,
          pickupBranchId: payload.pickupBranchId
        });
        res.status(201).json(order);
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.checkoutInvalid);
        res.status(apiError.status).json({ error: apiError.message });
      }
    },
    async getOrderHandler(req: Request, res: Response) {
      const auth = (req as AuthRequest).auth;
      if (!auth) {
        res.status(ApiErrors.unauthorized.status).json({ error: ApiErrors.unauthorized.message });
        return;
      }

      try {
        const order = await useCases.getOrder({
          userId: auth.userId,
          orderId: String(req.params.orderId)
        });
        if (!order) {
          res.status(ApiErrors.checkoutOrderNotFound.status).json({ error: ApiErrors.checkoutOrderNotFound.message });
          return;
        }
        res.status(200).json({ order });
      } catch (error) {
        const apiError = asApiError(error, ApiErrors.serverError);
        res.status(apiError.status).json({ error: apiError.message });
      }
    }
  };
}
