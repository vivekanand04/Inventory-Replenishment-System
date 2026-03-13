import { randomUUID } from "crypto";
import { prisma, withAdvisoryLock } from "../prismaClient";
import { computeReorderQuantity } from "./reorderAlgorithm";
import { ConsumptionService } from "./consumptionService";
import { AuditService } from "./auditService";

const timeBucketForNow = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
};

const defaultIdempotencyKeyForProduct = (productId: number): string => {
  const bucket = timeBucketForNow();
  return `reorder-${productId}-${bucket}`;
};

export const ReorderService = {
  evaluateReorder: async (productId: number, idempotencyKey?: string) => {
    const effectiveKey = idempotencyKey ?? defaultIdempotencyKeyForProduct(productId);
    const bucket = timeBucketForNow();
    return await withAdvisoryLock(productId, async () => {
      const existing = await prisma.reorder.findFirst({
        where: {
          productId,
          time_bucket: bucket
        }
      });
      if (existing) {
        return existing;
      }
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true }
      });
      if (!product || !product.inventory) {
        throw new Error("Product or inventory not found");
      }
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const consumptionRecords = await ConsumptionService.aggregateConsumption(productId, since);
      const quantities = consumptionRecords.map(r => r.quantity);
      const evaluation = computeReorderQuantity({
        productId,
        reorderMin: product.reorder_min,
        reorderMax: product.reorder_max,
        leadTimeDays: product.lead_time_days,
        safetyStock: product.safety_stock,
        quantityAvailable: product.inventory.quantity_available,
        quantityInTransit: product.inventory.quantity_in_transit,
        recentConsumptions: quantities
      });
      if (!evaluation.shouldReorder) {
        await AuditService.appendEvent(
          { name: "reorder.skip", productId },
          { evaluation }
        );
        return null;
      }
      const reorder = await prisma.reorder.create({
        data: {
          productId,
          reorder_quantity: evaluation.reorderQuantity,
          status: "TRIGGERED",
          idempotency_key: effectiveKey,
          time_bucket: bucket
        }
      });
      await AuditService.appendEvent(
        { name: "reorder.trigger", productId },
        {
          reorderId: reorder.id,
          reorderQuantity: evaluation.reorderQuantity,
          evaluation
        }
      );
      return reorder;
    });
  },

  forceTriggerReorder: async (productId: number, idempotencyKey?: string) => {
    const key = idempotencyKey ?? randomUUID();
    const bucket = timeBucketForNow();
    const reorder = await prisma.reorder.create({
      data: {
        productId,
        reorder_quantity: 1,
        status: "TRIGGERED",
        idempotency_key: key,
        time_bucket: bucket
      }
    });
    await AuditService.appendEvent(
      { name: "reorder.forceTrigger", productId },
      { reorderId: reorder.id }
    );
    return reorder;
  },

  listPendingReorders: async () => {
    const reorders = await prisma.reorder.findMany({
      where: {
        status: {
          in: ["TRIGGERED", "CREATED_PO"]
        }
      }
    });
    return reorders;
  }
};

