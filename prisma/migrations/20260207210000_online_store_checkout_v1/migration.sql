-- CreateEnum
CREATE TYPE "PreorderDraftStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OnlineOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELED', 'CANCELLED_EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAY_IN_STORE');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateTable
CREATE TABLE "pickup_branches" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DECIMAL(10,6) NOT NULL,
    "longitude" DECIMAL(10,6) NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pickup_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preorder_drafts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "PreorderDraftStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "preorder_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preorder_draft_items" (
    "id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_snapshot" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "availability_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "preorder_draft_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "status" "OnlineOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "payment_method" "PaymentMethod" NOT NULL,
    "pickup_branch_id" UUID,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "online_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_snapshot" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "availability_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pickup_branches_city" ON "pickup_branches"("city");

-- CreateIndex
CREATE INDEX "idx_preorder_drafts_user_status" ON "preorder_drafts"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_preorder_items_draft" ON "preorder_draft_items"("draft_id");

-- CreateIndex
CREATE INDEX "idx_preorder_items_product" ON "preorder_draft_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_online_orders_user" ON "online_orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_online_orders_status" ON "online_orders"("status");

-- CreateIndex
CREATE INDEX "idx_online_orders_expires" ON "online_orders"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "online_orders_draft_id_key" ON "online_orders"("draft_id");

-- CreateIndex
CREATE INDEX "idx_online_order_items_order" ON "online_order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_inventory_reservation_order" ON "inventory_reservations"("order_id");

-- CreateIndex
CREATE INDEX "idx_inventory_reservation_status" ON "inventory_reservations"("status");

-- CreateIndex
CREATE INDEX "idx_inventory_reservation_expires" ON "inventory_reservations"("expires_at");

-- AddForeignKey
ALTER TABLE "preorder_drafts" ADD CONSTRAINT "preorder_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preorder_draft_items" ADD CONSTRAINT "preorder_draft_items_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "preorder_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "preorder_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_pickup_branch_id_fkey" FOREIGN KEY ("pickup_branch_id") REFERENCES "pickup_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
