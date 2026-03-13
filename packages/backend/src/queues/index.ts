import { Queue, Worker, JobsOptions } from "bullmq";
import { config } from "../config";
import { logger } from "../logging";
import { ReorderService } from "../services/reorderService";
import { PurchaseOrderService } from "../services/purchaseOrderService";
import { AlertService } from "../services/alertService";

const connection = {
  connection: {
    url: config.redisUrl
  }
};

export const reorderQueue = new Queue("reorderQueue", connection);
export const purchaseOrderQueue = new Queue("purchaseOrderQueue", connection);
export const supplierWebhookQueue = new Queue("supplierWebhookQueue", connection);
export const alertQueue = new Queue("alertQueue", connection);

export const enqueueReorderEvaluation = async (productId: number, options?: JobsOptions) => {
  await reorderQueue.add("evaluateReorder", { productId }, options);
};

export const enqueuePOCreation = async (reorderId: number, options?: JobsOptions) => {
  await purchaseOrderQueue.add("createPO", { reorderId }, options);
};

export const startWorkers = () => {
  new Worker(
    "reorderQueue",
    async job => {
      const productId = job.data.productId as number;
      await ReorderService.evaluateReorder(productId);
    },
    connection
  );

  new Worker(
    "purchaseOrderQueue",
    async job => {
      const reorderId = job.data.reorderId as number;
      try {
        await PurchaseOrderService.createPO(reorderId);
      } catch (e) {
        logger.error("PO creation failed", { reorderId, error: (e as Error).message, attempts: job.attemptsMade });
        // After several failed attempts, raise a warning alert so operators can intervene.
        if (job.attemptsMade >= 3) {
          await AlertService.createAlert(reorderId, "WARNING" as any, "Repeated purchase order creation failures");
        }
        throw e;
      }
    },
    connection
  );

  new Worker(
    "supplierWebhookQueue",
    async job => {
      const poId = job.data.poId as number;
      const status = job.data.status as string;
      logger.info("Supplier webhook job", { poId, status });
      await PurchaseOrderService.applySupplierStatus(poId, status);
    },
    connection
  );

  new Worker(
    "alertQueue",
    async job => {
      const { productId, level, message } = job.data as { productId: number; level: string; message: string };
      logger.info("Alert queue job", { productId, level, message });
      await AlertService.sendNotification(productId, level as any, message);
    },
    connection
  );
};

