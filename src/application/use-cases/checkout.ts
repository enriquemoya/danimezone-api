import type { CheckoutRepository } from "../ports";
import type { EmailService } from "../ports";
import { renderOrderCreatedEmail } from "../../email-templates";

export type CheckoutUseCases = {
  createDraft: (params: {
    userId: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceSnapshot?: number | null;
      availabilitySnapshot?: string | null;
    }>;
  }) => Promise<{
    draftId: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceSnapshot: number;
      currency: string;
      availabilitySnapshot: string;
    }>;
    removedItems: Array<{ productId: string; reason: "insufficient" | "missing" }>;
  }>;
  getActiveDraft: (params: { userId: string }) => Promise<{
    draftId: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceSnapshot: number;
      currency: string;
      availabilitySnapshot: string;
      name: string | null;
      slug: string | null;
      imageUrl: string | null;
      game: string | null;
    }>;
  } | null>;
  revalidate: (params: { items: Array<{ productId: string; quantity: number }> }) => Promise<{
    items: Array<{
      productId: string;
      quantity: number;
      priceSnapshot: number;
      currency: string;
      availabilitySnapshot: string;
    }>;
    removedItems: Array<{ productId: string; reason: "insufficient" | "missing" }>;
  }>;
  createOrder: (params: {
    userId: string;
    draftId: string;
    paymentMethod: "PAY_IN_STORE";
    pickupBranchId: string | null;
  }) => Promise<{ orderId: string; status: string; expiresAt: string }>;
  getOrder: (params: { userId: string; orderId: string }) => Promise<Record<string, unknown> | null>;
};

export function createCheckoutUseCases(deps: {
  checkoutRepository: CheckoutRepository;
  emailService?: EmailService;
}): CheckoutUseCases {
  return {
    createDraft: (params) => deps.checkoutRepository.createOrUpdateDraft(params),
    getActiveDraft: (params) => deps.checkoutRepository.getActiveDraft(params),
    revalidate: (params) => deps.checkoutRepository.revalidateItems(params),
    async createOrder(params) {
      const created = await deps.checkoutRepository.createOrder(params);
      if (created.customerEmail) {
        try {
          const mail = renderOrderCreatedEmail({
            locale: "es",
            orderId: created.orderId,
            status: created.status,
            subtotal: created.subtotal,
            currency: created.currency,
            expiresAt: created.expiresAt,
            pickupBranchName: created.pickupBranchName
          });
          await deps.emailService?.sendEmail({
            to: created.customerEmail,
            subject: mail.subject,
            html: mail.html,
            text: mail.text
          });
        } catch (error) {
          console.error("order created email failed", {
            orderId: created.orderId,
            error: error instanceof Error ? error.message : "unknown"
          });
        }
      }
      return {
        orderId: created.orderId,
        status: created.status,
        expiresAt: created.expiresAt
      };
    },
    getOrder: (params) => deps.checkoutRepository.getOrder(params)
  };
}
