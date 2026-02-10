import { ApiErrors } from "../errors/api-error";

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

const PAGE_SIZE_VALUES = new Set([20, 50, 100]);
const ORDER_SORT_VALUES = new Set(["createdAt", "status", "expiresAt", "subtotal"]);
const ORDER_DIRECTION_VALUES = new Set(["asc", "desc"]);

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return fallback;
  }
  return parsed;
}

export function validateOrderListQuery(query: Record<string, unknown>) {
  const page = parsePositiveInt(query.page, 1);
  const pageSize = parsePositiveInt(query.pageSize, 20);
  if (!PAGE_SIZE_VALUES.has(pageSize)) {
    throw ApiErrors.adminPaginationInvalid;
  }

  const statusRaw = typeof query.status === "string" ? query.status.trim().toUpperCase() : undefined;
  if (statusRaw && !ORDER_STATUSES.has(statusRaw)) {
    throw ApiErrors.orderStatusInvalid;
  }

  const search = typeof query.q === "string" ? query.q.trim() : "";
  const sortRaw = typeof query.sort === "string" ? query.sort.trim() : "";
  const directionRaw = typeof query.direction === "string" ? query.direction.trim().toLowerCase() : "";
  if (sortRaw && !ORDER_SORT_VALUES.has(sortRaw)) {
    throw ApiErrors.invalidRequest;
  }
  if (directionRaw && !ORDER_DIRECTION_VALUES.has(directionRaw)) {
    throw ApiErrors.invalidRequest;
  }
  return {
    page,
    pageSize,
    status: statusRaw || undefined,
    query: search || undefined,
    sort: (sortRaw || undefined) as "createdAt" | "status" | "expiresAt" | "subtotal" | undefined,
    direction: (directionRaw || undefined) as "asc" | "desc" | undefined
  };
}

export function validateTransitionBody(payload: unknown) {
  const toStatus = String((payload as { toStatus?: unknown })?.toStatus ?? "")
    .trim()
    .toUpperCase();
  if (!toStatus || !ORDER_STATUSES.has(toStatus)) {
    throw ApiErrors.orderStatusInvalid;
  }

  const reasonRaw = (payload as { reason?: unknown })?.reason;
  const reason = reasonRaw === undefined || reasonRaw === null ? null : String(reasonRaw).trim();
  return {
    toStatus,
    reason: reason || null
  };
}
