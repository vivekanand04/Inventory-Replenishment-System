import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient";

export const productRouter = Router();

const createProductSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  reorder_level: z.number().int(),
  reorder_point: z.number().int(),
  safety_stock: z.number().int(),
  unit_cost: z.number(),
  lead_time_days: z.number().int(),
  reorder_min: z.number().int(),
  reorder_max: z.number().int()
});

productRouter.post("/", async (req, res) => {
  const parsed = createProductSchema.parse(req.body);
  const created = await prisma.product.create({
    data: {
      ...parsed,
      unit_cost: parsed.unit_cost
    }
  });
  await prisma.inventory.create({
    data: {
      productId: created.id,
      quantity_available: 0,
      quantity_in_transit: 0,
      blocked_quantity: 0,
      state: "OUT_OF_STOCK"
    }
  });
  res.status(201).json(created);
});

productRouter.get("/", async (_req, res) => {
  const products = await prisma.product.findMany({
    include: {
      inventory: true
    }
  });
  res.json(products);
});

