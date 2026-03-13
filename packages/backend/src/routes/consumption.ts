import { Router } from "express";
import { z } from "zod";
import { ConsumptionService } from "../services/consumptionService";
import { InventoryService } from "../services/inventoryService";

export const consumptionRouter = Router();

const consumptionSchema = z.object({
  productId: z.number().int(),
  qty: z.number().int().positive(),
  type: z.enum(["SALE", "USAGE", "ADJUSTMENT"]),
  reference: z.string(),
  idempotencyKey: z.string().optional()
});

consumptionRouter.post("/", async (req, res) => {
  const body = consumptionSchema.parse(req.body);
  await ConsumptionService.recordConsumption(body.productId, body.type, body.qty, body.reference);
  await InventoryService.applyConsumption(body.productId, body.qty, body.reference, body.type);
  res.status(201).json({ status: "ok" });
});

