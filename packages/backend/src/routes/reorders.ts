import { Router } from "express";
import { z } from "zod";
import { ReorderService } from "../services/reorderService";

export const reorderRouter = Router();

const triggerSchema = z.object({
  productIds: z.array(z.number().int()).min(1),
  idempotencyKey: z.string().optional()
});

reorderRouter.post("/trigger", async (req, res) => {
  const body = triggerSchema.parse(req.body);
  const results = [];
  for (const productId of body.productIds) {
    const reorder = await ReorderService.evaluateReorder(productId, body.idempotencyKey);
    results.push({ productId, reorder });
  }
  res.json(results);
});

reorderRouter.get("/", async (_req, res) => {
  const reorders = await ReorderService.listPendingReorders();
  res.json(reorders);
});

