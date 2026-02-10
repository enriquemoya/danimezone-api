import { OnlineOrderStatus, Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";
import { ApiErrors } from "../../errors/api-error";

const LOW_STOCK_THRESHOLD = 3;
const EXPIRATION_DAYS = 10;

function normalizeStatus(value: string) {
  if (value === "CANCELED") {
    return "CANCELLED_MANUAL";
  }
  return value;
}

function toDbStatus(value: string): OnlineOrderStatus {
  if (value === "CANCELLED_MANUAL") {
    return "CANCELLED_MANUAL";
  }
  if (value === "CANCELLED_EXPIRED") {
    return "CANCELLED_EXPIRED";
  }
  if (value === "CREATED") {
    return "CREATED";
  }
  if (value === "PENDING_PAYMENT") {
    return "PENDING_PAYMENT";
  }
  if (value === "PAID") {
    return "PAID";
  }
  if (value === "READY_FOR_PICKUP") {
    return "READY_FOR_PICKUP";
  }
  if (value === "SHIPPED") {
    return "SHIPPED";
  }
  throw ApiErrors.orderStatusInvalid;
}

function toAvailability(available: number) {
  if (available <= 0) {
    return "out_of_stock";
  }
  if (available <= LOW_STOCK_THRESHOLD) {
    return "low_stock";
  }
  return "in_stock";
}

function toSnapshotPrice(value: Prisma.Decimal | null) {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchInventorySnapshots(productIds: string[]) {
  if (productIds.length === 0) {
    return [];
  }
  return prisma.readModelInventory.findMany({
    where: { productId: { in: productIds } },
    select: {
      productId: true,
      available: true,
      price: true
    }
  });
}

function buildSnapshots(params: {
  items: Array<{ productId: string; quantity: number }>;
  inventoryRows: Array<{ productId: string; available: number; price: Prisma.Decimal | null }>;
}) {
  const inventoryMap = new Map(
    params.inventoryRows.map((row) => [row.productId, { available: row.available, price: row.price }])
  );

  const normalized: Array<{
    productId: string;
    quantity: number;
    priceSnapshot: number;
    currency: string;
    availabilitySnapshot: string;
  }> = [];
  const removedItems: Array<{ productId: string; reason: "insufficient" | "missing" }> = [];

  params.items.forEach((item) => {
    const record = inventoryMap.get(item.productId);
    if (!record) {
      removedItems.push({ productId: item.productId, reason: "missing" });
      return;
    }
    if (record.available <= 0 || record.available < item.quantity) {
      removedItems.push({ productId: item.productId, reason: "insufficient" });
      return;
    }
    const priceSnapshot = toSnapshotPrice(record.price);
    if (priceSnapshot === null) {
      removedItems.push({ productId: item.productId, reason: "missing" });
      return;
    }
    normalized.push({
      productId: item.productId,
      quantity: item.quantity,
      priceSnapshot,
      currency: "MXN",
      availabilitySnapshot: toAvailability(record.available)
    });
  });

  return { items: normalized, removedItems };
}

async function releaseReservations(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date
) {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId, status: "ACTIVE" }
  });

  for (const reservation of reservations) {
    await tx.readModelInventory.updateMany({
      where: { productId: reservation.productId },
      data: { available: { increment: reservation.quantity } }
    });
  }

  await tx.inventoryReservation.updateMany({
    where: { orderId, status: "ACTIVE" },
    data: { status: "RELEASED", releasedAt: now }
  });
}

function mapStatusTimeline(statusLogs: Array<{
  id: string;
  fromStatus: OnlineOrderStatus | null;
  toStatus: OnlineOrderStatus;
  reason: string | null;
  actorUserId: string | null;
  createdAt: Date;
}>) {
  return statusLogs
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus ? normalizeStatus(row.fromStatus) : null,
      toStatus: normalizeStatus(row.toStatus),
      reason: row.reason,
      actorUserId: row.actorUserId,
      createdAt: row.createdAt.toISOString()
    }));
}

export async function createOrUpdateDraft(params: {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceSnapshot?: number | null;
    availabilitySnapshot?: string | null;
  }>;
}) {
  const productIds = params.items.map((item) => item.productId);
  const inventoryRows = await fetchInventorySnapshots(productIds);
  const snapshots = buildSnapshots({ items: params.items, inventoryRows });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.preorderDraft.findFirst({
      where: { userId: params.userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" }
    });

    const draft = existing
      ? await tx.preorderDraft.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() }
        })
      : await tx.preorderDraft.create({
          data: { userId: params.userId, status: "ACTIVE" }
        });

    await tx.preorderDraftItem.deleteMany({ where: { draftId: draft.id } });

    if (snapshots.items.length) {
      await tx.preorderDraftItem.createMany({
        data: snapshots.items.map((item) => ({
          draftId: draft.id,
          productId: item.productId,
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
          currency: item.currency,
          availabilitySnapshot: item.availabilitySnapshot
        }))
      });
    }

    return { draftId: draft.id, items: snapshots.items, removedItems: snapshots.removedItems };
  });

  return result;
}

export async function getActiveDraft(params: { userId: string }) {
  const draft = await prisma.preorderDraft.findFirst({
    where: { userId: params.userId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: { items: true }
  });

  if (!draft) {
    return null;
  }

  const productIds = draft.items.map((item) => item.productId);
  const inventoryRows = await prisma.readModelInventory.findMany({
    where: { productId: { in: productIds } },
    select: {
      productId: true,
      displayName: true,
      slug: true,
      imageUrl: true,
      game: true
    }
  });
  const inventoryMap = new Map(
    inventoryRows.map((row) => [
      row.productId,
      {
        name: row.displayName ?? null,
        slug: row.slug ?? null,
        imageUrl: row.imageUrl ?? null,
        game: row.game ?? null
      }
    ])
  );

  return {
    draftId: draft.id,
    items: draft.items.map((item) => {
      const info = inventoryMap.get(item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceSnapshot: Number(item.priceSnapshot),
        currency: item.currency,
        availabilitySnapshot: item.availabilitySnapshot,
        name: info?.name ?? item.productId,
        slug: info?.slug ?? null,
        imageUrl: info?.imageUrl ?? null,
        game: info?.game ?? null
      };
    })
  };
}

export async function revalidateItems(params: {
  items: Array<{ productId: string; quantity: number }>;
}) {
  const productIds = params.items.map((item) => item.productId);
  const inventoryRows = await fetchInventorySnapshots(productIds);
  return buildSnapshots({ items: params.items, inventoryRows });
}

export async function createOrder(params: {
  userId: string;
  draftId: string;
  paymentMethod: "PAY_IN_STORE";
  pickupBranchId: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.onlineOrder.findFirst({
      where: { draftId: params.draftId },
      include: {
        user: { select: { email: true } },
        pickupBranch: { select: { name: true } }
      }
    });

    if (existingOrder) {
      return {
        orderId: existingOrder.id,
        status: normalizeStatus(existingOrder.status),
        expiresAt: existingOrder.expiresAt.toISOString(),
        customerEmail: existingOrder.user?.email ?? null,
        subtotal: Number(existingOrder.subtotal),
        currency: existingOrder.currency,
        pickupBranchName: existingOrder.pickupBranch?.name ?? null
      };
    }

    const draft = await tx.preorderDraft.findFirst({
      where: { id: params.draftId, userId: params.userId },
      include: { items: true }
    });

    if (!draft) {
      throw ApiErrors.checkoutDraftNotFound;
    }

    if (draft.status !== "ACTIVE") {
      throw ApiErrors.checkoutDraftInactive;
    }

    if (params.pickupBranchId) {
      const branch = await tx.pickupBranch.findUnique({ where: { id: params.pickupBranchId } });
      if (!branch) {
        throw ApiErrors.branchNotFound;
      }
    }

    if (!draft.items.length) {
      throw ApiErrors.checkoutDraftEmpty;
    }

    const productIds = draft.items.map((item) => item.productId);
    const inventoryRows = await tx.readModelInventory.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, available: true }
    });
    const inventoryMap = new Map(inventoryRows.map((row) => [row.productId, row.available]));

    for (const item of draft.items) {
      const available = inventoryMap.get(item.productId);
      if (available === undefined || available < item.quantity || available <= 0) {
        throw ApiErrors.checkoutInventoryInsufficient;
      }
    }

    const subtotal = draft.items.reduce((sum, item) => {
      const price = Number(item.priceSnapshot);
      return sum + price * item.quantity;
    }, 0);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    const order = await tx.onlineOrder.create({
      data: {
        userId: params.userId,
        draftId: draft.id,
        status: "PENDING_PAYMENT",
        statusUpdatedAt: now,
        paymentMethod: params.paymentMethod,
        pickupBranchId: params.pickupBranchId,
        subtotal: new Prisma.Decimal(subtotal),
        currency: "MXN",
        expiresAt
      },
      include: {
        user: { select: { email: true } },
        pickupBranch: { select: { name: true } }
      }
    });

    await tx.onlineOrderItem.createMany({
      data: draft.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        currency: item.currency,
        availabilitySnapshot: item.availabilitySnapshot
      }))
    });

    await tx.inventoryReservation.createMany({
      data: draft.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        status: "ACTIVE",
        expiresAt
      }))
    });

    for (const item of draft.items) {
      await tx.readModelInventory.update({
        where: { productId: item.productId },
        data: { available: { decrement: item.quantity } }
      });
    }

    await tx.preorderDraft.update({
      where: { id: draft.id },
      data: { status: "CONVERTED" }
    });

    await tx.onlineOrderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: "PENDING_PAYMENT",
        reason: "order_created",
        actorUserId: null
      }
    });

    return {
      orderId: order.id,
      status: normalizeStatus(order.status),
      expiresAt: order.expiresAt.toISOString(),
      customerEmail: order.user?.email ?? null,
      subtotal,
      currency: order.currency,
      pickupBranchName: order.pickupBranch?.name ?? null
    };
  });
}

export async function getOrder(params: { userId: string; orderId: string }) {
  const order = await prisma.onlineOrder.findFirst({
    where: { id: params.orderId, userId: params.userId },
    include: { items: true, pickupBranch: true, statusLogs: true }
  });

  if (!order) {
    return null;
  }

  return {
    id: order.id,
    status: normalizeStatus(order.status),
    paymentMethod: order.paymentMethod,
    subtotal: Number(order.subtotal),
    currency: order.currency,
    expiresAt: order.expiresAt.toISOString(),
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    pickupBranch: order.pickupBranch,
    items: order.items.map((item) => ({
      ...item,
      priceSnapshot: Number(item.priceSnapshot)
    })),
    timeline: mapStatusTimeline(order.statusLogs)
  };
}

export async function listAdminOrders(params: {
  page: number;
  pageSize: number;
  query?: string;
  status?: string;
  sort?: "createdAt" | "status" | "expiresAt" | "subtotal";
  direction?: "asc" | "desc";
}) {
  const search = params.query?.trim();
  const isUuid = Boolean(search && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search));

  const where: Prisma.OnlineOrderWhereInput = {
    ...(params.status ? { status: toDbStatus(params.status) } : {}),
    ...(search
      ? {
          OR: [
            ...(isUuid ? [{ id: search }] : []),
            { user: { email: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const sortFieldMap: Record<
    "createdAt" | "status" | "expiresAt" | "subtotal",
    "createdAt" | "status" | "expiresAt" | "subtotal"
  > = {
    createdAt: "createdAt",
    status: "status",
    expiresAt: "expiresAt",
    subtotal: "subtotal"
  };
  const sortField = params.sort ? sortFieldMap[params.sort] : "createdAt";
  const sortDirection = params.direction ?? "desc";

  const [items, total] = await prisma.$transaction([
    prisma.onlineOrder.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { [sortField]: sortDirection },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        pickupBranch: { select: { name: true, city: true } }
      }
    }),
    prisma.onlineOrder.count({ where })
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      status: normalizeStatus(item.status),
      subtotal: Number(item.subtotal),
      currency: item.currency,
      paymentMethod: item.paymentMethod,
      expiresAt: item.expiresAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      statusUpdatedAt: item.statusUpdatedAt.toISOString(),
      customer: {
        email: item.user.email,
        name: [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || null
      },
      pickupBranch: item.pickupBranch
        ? { name: item.pickupBranch.name, city: item.pickupBranch.city }
        : null
    })),
    total
  };
}

export async function getOrderTransitionContext(params: { orderId: string }) {
  const order = await prisma.onlineOrder.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      pickupBranchId: true
    }
  });

  if (!order) {
    return null;
  }

  return {
    orderId: order.id,
    status: normalizeStatus(order.status),
    paymentMethod: order.paymentMethod,
    pickupBranchId: order.pickupBranchId
  };
}

export async function getAdminOrder(params: { orderId: string }) {
  const order = await prisma.onlineOrder.findUnique({
    where: { id: params.orderId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      pickupBranch: true,
      items: true,
      statusLogs: {
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!order) {
    return null;
  }

  return {
    id: order.id,
    status: normalizeStatus(order.status),
    subtotal: Number(order.subtotal),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    expiresAt: order.expiresAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    cancelReason: order.cancelReason,
    customer: {
      id: order.user.id,
      email: order.user.email,
      name: [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") || null
    },
    pickupBranch: order.pickupBranch,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      priceSnapshot: Number(item.priceSnapshot),
      currency: item.currency,
      availabilitySnapshot: item.availabilitySnapshot
    })),
    timeline: order.statusLogs.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus ? normalizeStatus(row.fromStatus) : null,
      toStatus: normalizeStatus(row.toStatus),
      reason: row.reason,
      actor: row.actor
        ? {
            id: row.actor.id,
            email: row.actor.email,
            name: [row.actor.firstName, row.actor.lastName].filter(Boolean).join(" ") || null
          }
        : null,
      createdAt: row.createdAt.toISOString()
    }))
  };
}

export async function listCustomerOrders(params: {
  userId: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.OnlineOrderWhereInput = { userId: params.userId };
  const [items, total] = await prisma.$transaction([
    prisma.onlineOrder.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        pickupBranch: { select: { name: true, city: true } }
      }
    }),
    prisma.onlineOrder.count({ where })
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      status: normalizeStatus(item.status),
      subtotal: Number(item.subtotal),
      currency: item.currency,
      paymentMethod: item.paymentMethod,
      expiresAt: item.expiresAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      statusUpdatedAt: item.statusUpdatedAt.toISOString(),
      pickupBranch: item.pickupBranch
        ? { name: item.pickupBranch.name, city: item.pickupBranch.city }
        : null
    })),
    total
  };
}

export async function getCustomerOrder(params: { userId: string; orderId: string }) {
  const order = await prisma.onlineOrder.findUnique({
    where: { id: params.orderId },
    include: {
      pickupBranch: true,
      items: true,
      statusLogs: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!order) {
    return null;
  }

  if (order.userId !== params.userId) {
    throw ApiErrors.orderForbidden;
  }

  return {
    id: order.id,
    status: normalizeStatus(order.status),
    subtotal: Number(order.subtotal),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    expiresAt: order.expiresAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    pickupBranch: order.pickupBranch,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      priceSnapshot: Number(item.priceSnapshot),
      currency: item.currency,
      availabilitySnapshot: item.availabilitySnapshot
    })),
    timeline: mapStatusTimeline(order.statusLogs)
  };
}

export async function transitionOrderStatus(params: {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string | null;
  reason: string | null;
  source: "admin" | "system";
}) {
  const toStatus = normalizeStatus(params.toStatus);
  const fromStatus = normalizeStatus(params.fromStatus);

  return prisma.$transaction(async (tx) => {
    const order = await tx.onlineOrder.findUnique({
      where: { id: params.orderId },
      include: {
        user: { select: { email: true } }
      }
    });

    if (!order) {
      throw ApiErrors.checkoutOrderNotFound;
    }

    const currentStatus = normalizeStatus(order.status);
    if (currentStatus !== fromStatus) {
      throw ApiErrors.orderTransitionInvalid;
    }
    if (fromStatus === toStatus) {
      return {
        orderId: order.id,
        fromStatus,
        toStatus,
        customerEmail: order.user.email ?? null
      };
    }

    const now = new Date();
    if (toStatus === "CANCELLED_EXPIRED" || toStatus === "CANCELLED_MANUAL") {
      await releaseReservations(tx, order.id, now);
    }

    await tx.onlineOrder.update({
      where: { id: order.id },
      data: {
        status: toDbStatus(toStatus),
        statusUpdatedAt: now,
        cancelReason: toStatus === "CANCELLED_MANUAL" ? params.reason ?? null : null,
        cancelledByUserId: toStatus === "CANCELLED_MANUAL" ? params.actorUserId : null
      }
    });

    await tx.onlineOrderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: toDbStatus(fromStatus),
        toStatus: toDbStatus(toStatus),
        reason: params.reason,
        actorUserId: params.actorUserId
      }
    });

    return {
      orderId: order.id,
      fromStatus,
      toStatus,
      customerEmail: order.user.email ?? null
    };
  });
}

export async function expirePendingOrders() {
  const pending = await prisma.onlineOrder.findMany({
    where: {
      status: "PENDING_PAYMENT",
      expiresAt: { lte: new Date() }
    },
    select: { id: true }
  });

  const results: Array<{
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    customerEmail: string | null;
  }> = [];

  for (const item of pending) {
    try {
      const transitioned = await transitionOrderStatus({
        orderId: item.id,
        fromStatus: "PENDING_PAYMENT",
        toStatus: "CANCELLED_EXPIRED",
        actorUserId: null,
        reason: "expired_unpaid",
        source: "system"
      });
      results.push(transitioned);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      console.error("expiration transition failed", {
        orderId: item.id,
        error: message
      });
    }
  }

  return results;
}
