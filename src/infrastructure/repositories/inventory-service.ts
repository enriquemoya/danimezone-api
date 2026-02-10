import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";

export async function listInventory(params: {
  page: number;
  pageSize: number;
  query?: string;
  sort?: "updatedAt" | "available" | "name";
  direction?: "asc" | "desc";
}) {
  const skip = (params.page - 1) * params.pageSize;
  const query = params.query?.trim();
  const where = query
    ? {
        OR: [
          { displayName: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { slug: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { category: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { game: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { productId: { contains: query, mode: Prisma.QueryMode.insensitive } }
        ]
      }
    : undefined;

  const direction = params.direction ?? "desc";
  const orderBy =
    params.sort === "available"
      ? { available: direction }
      : params.sort === "name"
        ? { displayName: direction }
        : { updatedAt: direction };

  const [items, total] = await prisma.$transaction([
    prisma.readModelInventory.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      select: {
        productId: true,
        displayName: true,
        slug: true,
        category: true,
        game: true,
        available: true,
        price: true,
        imageUrl: true
      }
    }),
    prisma.readModelInventory.count({ where })
  ]);

  return { items, total };
}

export async function adjustInventory(params: {
  productId: string;
  delta: number;
  reason: string;
  actorUserId: string;
}) {
  const record = await prisma.readModelInventory.findUnique({
    where: { productId: params.productId }
  });

  if (!record) {
    return null;
  }

  const previousQuantity = record.available;
  const nextQuantity = Math.max(previousQuantity + params.delta, 0);
  const appliedDelta = nextQuantity - previousQuantity;

  const [item, adjustment] = await prisma.$transaction([
    prisma.readModelInventory.update({
      where: { productId: params.productId },
      data: { available: nextQuantity }
    }),
    prisma.inventoryAdjustment.create({
      data: {
        productId: params.productId,
        delta: appliedDelta,
        reason: params.reason,
        actorUserId: params.actorUserId,
        previousQuantity,
        newQuantity: nextQuantity
      }
    })
  ]);

  return { item, adjustment };
}
