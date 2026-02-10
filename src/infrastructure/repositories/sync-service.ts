import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { withClient } from "../db/pg";
import { prisma } from "../db/prisma";
import { isIsoString } from "../../validation/common";

export async function recordEvents(events: any[]) {
  const accepted: string[] = [];
  const duplicates: string[] = [];

  await withClient(async (client) => {
    for (const event of events) {
      if (!event?.eventId || !event.type || !event.source || !event.payload || !event.occurredAt) {
        throw new Error("invalid event payload");
      }
      if (!isIsoString(event.occurredAt)) {
        throw new Error("invalid occurredAt");
      }

      const eventId = String(event.eventId);
      const idempotencyKey = event.idempotencyKey ? String(event.idempotencyKey) : eventId;
      const existing = await client.query(
        "SELECT event_id FROM sync_events WHERE event_id = $1",
        [idempotencyKey]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        duplicates.push(eventId);
        continue;
      }

      await client.query(
        `INSERT INTO sync_events (id, event_id, type, occurred_at, source, payload, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
        [crypto.randomUUID(), idempotencyKey, event.type, event.occurredAt, event.source, event.payload]
      );
      accepted.push(eventId);
    }
  });

  return { accepted, duplicates };
}

export async function getPendingEvents(posId: string, since: string | null) {
  return withClient(async (client) => {
    const params: (string | null)[] = [posId];
    let where = "WHERE e.event_id NOT IN (SELECT event_id FROM pos_event_ack WHERE pos_id = $1)";
    if (since) {
      params.push(since);
      where += ` AND e.occurred_at >= $${params.length}`;
    }
    const result = await client.query(
      `SELECT e.event_id, e.type, e.occurred_at, e.source, e.payload
       FROM sync_events e
       ${where}
       ORDER BY e.occurred_at ASC, e.event_id ASC`,
      params
    );
    return result.rows;
  });
}

export async function acknowledgeEvents(posId: string, eventIds: string[]) {
  await withClient(async (client) => {
    for (const eventId of eventIds) {
      await client.query(
        "INSERT INTO pos_event_ack (pos_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [posId, eventId]
      );
    }
  });
}

export async function createOrder(orderId: string, items: any[]) {
  return withClient(async (client) => {
    const existing = await client.query("SELECT order_id FROM orders WHERE order_id = $1", [orderId]);
    if (existing.rowCount && existing.rowCount > 0) {
      return { duplicate: true };
    }

    await client.query(
      "INSERT INTO orders (id, order_id, status, payload) VALUES ($1, $2, $3, $4)",
      [crypto.randomUUID(), orderId, "CREATED", { items }]
    );

    const eventId = `order-${orderId}`;
    await client.query(
      `INSERT INTO sync_events (id, event_id, type, occurred_at, source, payload, status)
       VALUES ($1, $2, 'ONLINE_SALE', $3, $4, $5, 'PENDING')
       ON CONFLICT (event_id) DO NOTHING`,
      [crypto.randomUUID(), eventId, new Date().toISOString(), "online-store", { orderId, items }]
    );

    for (const item of items) {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      if (!quantity) {
        continue;
      }
      await client.query(
        `INSERT INTO read_model_inventory
         (product_id, available, updated_at, last_synced_at, availability_state)
         VALUES ($1, 0, NOW(), NOW(), 'PENDING_SYNC')
         ON CONFLICT (product_id)
         DO UPDATE SET
           available = GREATEST(0, read_model_inventory.available - $2),
           updated_at = NOW(),
           last_synced_at = NOW(),
           availability_state = CASE
             WHEN (read_model_inventory.available - $2) <= 0 THEN 'SOLD_OUT'
             WHEN (read_model_inventory.available - $2) <= 2 THEN 'LOW_STOCK'
             ELSE 'AVAILABLE'
           END`,
        [String(item.productId), quantity]
      );
    }

    return { duplicate: false };
  });
}

export async function readProducts(params: {
  page: number;
  pageSize: number;
  id: string | null;
  gameId?: string | "misc" | null;
  categoryId?: string | null;
  expansionId?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
}) {
  const where: Prisma.ReadModelInventoryWhereInput = {};

  if (params.id) {
    where.productId = params.id;
  }
  if (params.gameId === "misc") {
    where.gameId = null;
  } else if (params.gameId) {
    where.gameId = params.gameId;
  }
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }
  if (params.expansionId) {
    where.expansionId = params.expansionId;
  }
  if (params.priceMin != null || params.priceMax != null) {
    where.price = {
      ...(params.priceMin != null ? { gte: params.priceMin } : {}),
      ...(params.priceMax != null ? { lte: params.priceMax } : {})
    };
  }

  const [items, total] = await prisma.$transaction([
    prisma.readModelInventory.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        productId: true,
        slug: true,
        available: true,
        updatedAt: true,
        displayName: true,
        shortDescription: true,
        price: true,
        imageUrl: true,
        category: true,
        categoryId: true,
        game: true,
        gameId: true,
        expansionId: true,
        availabilityState: true,
        lastSyncedAt: true
      }
    }),
    prisma.readModelInventory.count({ where })
  ]);

  const result = items.map((row) => {
    const derivedState = (() => {
      if (!row.lastSyncedAt) {
        return "PENDING_SYNC";
      }
      if (row.available <= 0) {
        return "SOLD_OUT";
      }
      if (row.available <= 2) {
        return "LOW_STOCK";
      }
      return "AVAILABLE";
    })();

    return {
      id: row.productId,
      slug: row.slug ?? null,
      name: row.displayName ?? null,
      category: row.category ?? null,
      categoryId: row.categoryId ?? null,
      price: row.price === null ? null : { amount: Number(row.price), currency: "MXN" },
      game: row.game ?? null,
      gameId: row.gameId ?? null,
      expansionId: row.expansionId ?? null,
      imageUrl: row.imageUrl ?? null,
      available: row.available,
      state: row.availabilityState ?? derivedState,
      updatedAt: row.updatedAt,
      shortDescription: row.shortDescription ?? null,
      lastSyncedAt: row.lastSyncedAt ?? null
    };
  });

  return { items: result, total };
}
