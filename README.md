# Cloud API v1

Standalone backend for online store events and POS sync.

## Setup

```powershell
cd apps/cloud-api
npm install
```

Create `.env` from `.env.example`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pos_cloud
CLOUD_SHARED_SECRET=change-me
PORT=4000
```

Run migrations:

```powershell
npm run prisma:migrate:deploy
```

Start dev server:

```powershell
npm run dev
```

## Prisma commands

```powershell
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```

## Auth

All requests require header:

```
x-cloud-secret: <CLOUD_SHARED_SECRET>
```

## Endpoints

### POST /orders
Creates an order and emits an ONLINE_SALE event.

Example:

```bash
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -H "x-cloud-secret: change-me" \
  -d '{"orderId":"order-001","items":[{"productId":"p1","quantity":2}]}'
```

### POST /sync/events
Append events to the event store.

```bash
curl -X POST http://localhost:4000/sync/events \
  -H "Content-Type: application/json" \
  -H "x-cloud-secret: change-me" \
  -d '{"events":[{"eventId":"evt-1","type":"ONLINE_SALE","occurredAt":"2026-01-01T10:00:00Z","source":"online-store","payload":{"orderId":"order-1","items":[{"productId":"p1","quantity":1}]}}]}'
```

### GET /sync/pending
Fetch pending events for a POS.

```bash
curl "http://localhost:4000/sync/pending?posId=pos-local" \
  -H "x-cloud-secret: change-me"
```

### POST /sync/ack
Acknowledge events.

```bash
curl -X POST http://localhost:4000/sync/ack \
  -H "Content-Type: application/json" \
  -H "x-cloud-secret: change-me" \
  -d '{"posId":"pos-local","eventIds":["order-order-001"]}'
```
