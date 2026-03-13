-- CreateEnum
CREATE TYPE "ConsumptionType" AS ENUM ('SALE', 'USAGE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReorderStatus" AS ENUM ('TRIGGERED', 'CREATED_PO', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('CREATED', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryState" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'REORDER_TRIGGERED', 'IN_TRANSIT', 'RECEIVED', 'OUT_OF_STOCK', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reorder_level" INTEGER NOT NULL,
    "reorder_point" INTEGER NOT NULL,
    "safety_stock" INTEGER NOT NULL,
    "unit_cost" DECIMAL(65,30) NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "reorder_min" INTEGER NOT NULL,
    "reorder_max" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity_available" INTEGER NOT NULL DEFAULT 0,
    "quantity_in_transit" INTEGER NOT NULL DEFAULT 0,
    "blocked_quantity" INTEGER NOT NULL DEFAULT 0,
    "state" "InventoryState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumptionRecord" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" "ConsumptionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reorder" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReorderStatus" NOT NULL,
    "reorder_quantity" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "time_bucket" TEXT NOT NULL,

    CONSTRAINT "Reorder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lead_time_days_override" INTEGER,
    "contact_info" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "reorderId" INTEGER,
    "status" "PurchaseOrderStatus" NOT NULL,
    "expected_delivery_date" TIMESTAMP(3),
    "total_cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStateHistory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "from_state" "InventoryState" NOT NULL,
    "to_state" "InventoryState" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "InventoryStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "level" "AlertLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "context" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_key" ON "Inventory"("productId");

-- CreateIndex
CREATE INDEX "Reorder_productId_time_bucket_idx" ON "Reorder"("productId", "time_bucket");

-- CreateIndex
CREATE UNIQUE INDEX "Reorder_idempotency_key_key" ON "Reorder"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_externalId_key" ON "ProcessedWebhook"("externalId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumptionRecord" ADD CONSTRAINT "ConsumptionRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reorder" ADD CONSTRAINT "Reorder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_reorderId_fkey" FOREIGN KEY ("reorderId") REFERENCES "Reorder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStateHistory" ADD CONSTRAINT "InventoryStateHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
