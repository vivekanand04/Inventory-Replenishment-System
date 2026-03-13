import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient";
import { logger } from "../logging";

export const webhookRouter = Router();

const supplierSchema = z.object({
  id: z.string(),
  poId: z.number().int(),
  status: z.string()
});

webhookRouter.post("/supplier", async (req, res) => {
  const body = supplierSchema.parse(req.body);
  const existing = await prisma.processedWebhook.findUnique({
    where: { externalId: body.id }
  });
  if (existing) {
    res.status(200).json({ status: "ignored" });
    return;
  }
  await prisma.processedWebhook.create({
    data: {
      externalId: body.id
    }
  });
  logger.info("Supplier webhook received", { poId: body.poId, status: body.status });
  res.status(200).json({ status: "processed" });
});

