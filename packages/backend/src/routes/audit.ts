import { Router } from "express";
import { prisma } from "../prismaClient";

export const auditRouter = Router();

auditRouter.get("/", async (req, res) => {
  const productIdParam = req.query.productId as string | undefined;
  const takeParam = req.query.take as string | undefined;
  const where = productIdParam ? { productId: Number(productIdParam) } : {};
  const take = takeParam ? Number(takeParam) : 50;
  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    },
    take
  });
  res.json(events);
});

