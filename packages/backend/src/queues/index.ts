import { Queue, Worker, JobsOptions } from "bullmq";
import { config } from "../config";
import { logger } from "../logging";
import { ReorderService } from "../services/reorderService";
import { PurchaseOrderService } from "../services/purchaseOrderService";

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
        logger.error("PO creation failed", { reorderId, error: (e as Error).message });
        throw e;
      }
    },
    connection
  );

  new Worker(
    "supplierWebhookQueue",
    async job => {
      logger.info("Supplier webhook job", { data: job.data });
    },
    connection
  );

  new Worker(
    "alertQueue",
    async job => {
      logger.info("Alert queue job", { data: job.data });
    },
    connection
  );
};

