UPDATE "online_orders"
SET "status" = 'CANCELLED_MANUAL'::"OnlineOrderStatus"
WHERE "status" = 'CANCELED'::"OnlineOrderStatus";

UPDATE "online_order_status_logs"
SET "from_status" = 'CANCELLED_MANUAL'::"OnlineOrderStatus"
WHERE "from_status" = 'CANCELED'::"OnlineOrderStatus";

UPDATE "online_order_status_logs"
SET "to_status" = 'CANCELLED_MANUAL'::"OnlineOrderStatus"
WHERE "to_status" = 'CANCELED'::"OnlineOrderStatus";
