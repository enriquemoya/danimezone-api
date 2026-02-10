export type OrderCreatedTemplateInput = {
  locale?: "es" | "en";
  orderId: string;
  status: string;
  subtotal: number;
  currency: string;
  expiresAt: string | null;
  pickupBranchName: string | null;
};

export type OrderStatusUpdatedTemplateInput = {
  locale?: "es" | "en";
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
};

export declare function renderOrderCreatedEmail(
  params: OrderCreatedTemplateInput
): { subject: string; html: string; text: string };

export declare function renderOrderStatusUpdatedEmail(
  params: OrderStatusUpdatedTemplateInput
): { subject: string; html: string; text: string };
