ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OnlineOrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED_MANUAL';

ALTER TABLE "online_orders"
ADD COLUMN IF NOT EXISTS "status_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT,
ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" UUID;

UPDATE "online_orders"
SET "status_updated_at" = COALESCE("status_updated_at", "updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'online_orders_cancelled_by_user_id_fkey'
  ) THEN
    ALTER TABLE "online_orders"
    ADD CONSTRAINT "online_orders_cancelled_by_user_id_fkey"
    FOREIGN KEY ("cancelled_by_user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "online_order_status_logs" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "from_status" "OnlineOrderStatus",
  "to_status" "OnlineOrderStatus" NOT NULL,
  "reason" TEXT,
  "actor_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "online_order_status_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "online_order_status_logs_order_id_fkey"
    FOREIGN KEY ("order_id")
    REFERENCES "online_orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "online_order_status_logs_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_online_order_status_logs_order_created"
ON "online_order_status_logs"("order_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_online_order_status_logs_actor"
ON "online_order_status_logs"("actor_user_id");

CREATE INDEX IF NOT EXISTS "idx_online_orders_cancelled_by"
ON "online_orders"("cancelled_by_user_id");
