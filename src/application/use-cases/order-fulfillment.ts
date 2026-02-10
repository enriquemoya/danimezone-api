import { renderOrderStatusUpdatedEmail } from "../../email-templates";

import type { EmailService, OrderFulfillmentRepository } from "../ports";
import { ApiErrors } from "../../errors/api-error";

const ORDER_STATUSES = new Set([
  "CREATED",
  "PENDING_PAYMENT",
  "PAID",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "CANCELLED_EXPIRED",
  "CANCELLED_MANUAL",
  "CANCELED"
]);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["PENDING_PAYMENT", "PAID"],
  PENDING_PAYMENT: ["READY_FOR_PICKUP", "PAID", "CANCELLED_EXPIRED", "CANCELLED_MANUAL"],
  PAID: ["READY_FOR_PICKUP", "CANCELLED_MANUAL"],
  READY_FOR_PICKUP: ["PAID", "SHIPPED", "CANCELLED_MANUAL"],
  SHIPPED: [],
  CANCELLED_EXPIRED: [],
  CANCELLED_MANUAL: []
};

function normalizeStatus(value: string) {
  const normalized = value === "CANCELED" ? "CANCELLED_MANUAL" : value;
  if (!ORDER_STATUSES.has(value) && !ORDER_STATUSES.has(normalized)) {
    throw ApiErrors.orderStatusInvalid;
  }
  return normalized;
}

export type OrderFulfillmentUseCases = {
  listAdminOrders: (params: {
    page: number;
    pageSize: number;
    query?: string;
    status?: string;
    sort?: "createdAt" | "status" | "expiresAt" | "subtotal";
    direction?: "asc" | "desc";
  }) => Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  getAdminOrder: (params: { orderId: string }) => Promise<Record<string, unknown> | null>;
  listCustomerOrders: (params: {
    userId: string;
    page: number;
    pageSize: number;
  }) => Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  getCustomerOrder: (params: {
    userId: string;
    orderId: string;
  }) => Promise<Record<string, unknown> | null>;
  transitionOrderStatus: (params: {
    orderId: string;
    toStatus: string;
    actorUserId: string;
    reason: string | null;
  }) => Promise<{ orderId: string; fromStatus: string | null; toStatus: string }>;
  runExpirationSweep: () => Promise<{ expired: number }>;
};

async function sendStatusMail(
  emailService: EmailService,
  payload: { orderId: string; fromStatus: string | null; toStatus: string; customerEmail: string | null; reason?: string | null }
) {
  if (!payload.customerEmail) {
    return;
  }
  try {
    const mail = renderOrderStatusUpdatedEmail({
      locale: "es",
      orderId: payload.orderId,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
      reason: payload.reason ?? null
    });
    await emailService.sendEmail({
      to: payload.customerEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text
    });
  } catch (error) {
    console.error("order status email failed", {
      orderId: payload.orderId,
      toStatus: payload.toStatus,
      error: error instanceof Error ? error.message : "unknown"
    });
  }
}

export function createOrderFulfillmentUseCases(deps: {
  orderFulfillmentRepository: OrderFulfillmentRepository;
  emailService: EmailService;
}): OrderFulfillmentUseCases {
  return {
    listAdminOrders: (params) => deps.orderFulfillmentRepository.listAdminOrders(params),
    getAdminOrder: (params) => deps.orderFulfillmentRepository.getAdminOrder(params),
    listCustomerOrders: (params) => deps.orderFulfillmentRepository.listCustomerOrders(params),
    getCustomerOrder: (params) => deps.orderFulfillmentRepository.getCustomerOrder(params),
    async transitionOrderStatus(params) {
      const context = await deps.orderFulfillmentRepository.getOrderTransitionContext({
        orderId: params.orderId
      });
      if (!context) {
        throw ApiErrors.checkoutOrderNotFound;
      }

      const fromStatus = normalizeStatus(context.status);
      const toStatus = normalizeStatus(params.toStatus);
      if (fromStatus !== toStatus) {
        const allowed = ALLOWED_TRANSITIONS[fromStatus] ?? [];
        if (!allowed.includes(toStatus)) {
          throw ApiErrors.orderTransitionInvalid;
        }
      }

      if (
        fromStatus === "PENDING_PAYMENT" &&
        toStatus === "READY_FOR_PICKUP" &&
        (context.paymentMethod !== "PAY_IN_STORE" || !context.pickupBranchId)
      ) {
        throw ApiErrors.orderTransitionInvalid;
      }

      if (toStatus === "CANCELLED_MANUAL" && !params.reason?.trim()) {
        throw ApiErrors.orderTransitionReasonRequired;
      }

      const updated = await deps.orderFulfillmentRepository.transitionOrderStatus({
        orderId: params.orderId,
        fromStatus,
        toStatus,
        actorUserId: params.actorUserId,
        reason: params.reason,
        source: "admin"
      });
      await sendStatusMail(deps.emailService, {
        orderId: updated.orderId,
        fromStatus: updated.fromStatus,
        toStatus: updated.toStatus,
        customerEmail: updated.customerEmail,
        reason: params.reason
      });
      return {
        orderId: updated.orderId,
        fromStatus: updated.fromStatus,
        toStatus: updated.toStatus
      };
    },
    async runExpirationSweep() {
      const expired = await deps.orderFulfillmentRepository.expirePendingOrders();
      for (const entry of expired) {
        await sendStatusMail(deps.emailService, {
          orderId: entry.orderId,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          customerEmail: entry.customerEmail,
          reason: "expired_unpaid"
        });
      }
      return { expired: expired.length };
    }
  };
}
