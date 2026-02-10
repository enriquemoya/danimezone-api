import { prisma } from "../db/prisma";

const PENDING_SHIPMENT_STATUS = "CREATED";

export async function getAdminSummary() {
  const [pendingShipments, orders] = await prisma.$transaction([
    prisma.order.count({ where: { status: PENDING_SHIPMENT_STATUS } }),
    prisma.order.findMany({ select: { payload: true } })
  ]);

  const onlineSalesTotal = orders.reduce((sum, order) => {
    const payload = order.payload as { total?: number; items?: Array<{ price?: number; quantity?: number }> } | null;
    if (!payload) {
      return sum;
    }
    if (typeof payload.total === "number") {
      return sum + payload.total;
    }
    const itemsTotal = Array.isArray(payload.items)
      ? payload.items.reduce((itemSum, item) => {
          const price = typeof item.price === "number" ? item.price : 0;
          const quantity = typeof item.quantity === "number" ? item.quantity : 0;
          return itemSum + price * quantity;
        }, 0)
      : 0;
    return sum + itemsTotal;
  }, 0);

  return {
    pendingShipments,
    onlineSalesTotal,
    currency: "MXN"
  };
}
