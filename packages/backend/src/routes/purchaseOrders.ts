import { Router } from "express";
import { z } from "zod";
import { PurchaseOrderService } from "../services/purchaseOrderService";

export const purchaseOrderRouter = Router();

const receiptSchema = z.object({
  lines: z.array(
    z.object({
      productId: z.number().int(),
      qty_received: z.number().int().nonnegative()
    })
  )
});

purchaseOrderRouter.post("/:id/receive", async (req, res) => {
  const poId = Number(req.params.id);
  const body = receiptSchema.parse(req.body);
  const lines = body.lines.map(line => ({
    productId: line.productId,
    quantityReceived: line.qty_received
  }));
  const po = await PurchaseOrderService.applyReceipt(poId, lines);
  res.json(po);
});

