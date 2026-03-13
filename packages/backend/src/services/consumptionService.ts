import { ConsumptionType } from "shared";
import { prisma } from "../prismaClient";

export const ConsumptionService = {
  recordConsumption: async (productId: number, type: ConsumptionType, quantity: number, referenceId: string) => {
    const record = await prisma.consumptionRecord.create({
      data: {
        productId,
        type,
        quantity,
        referenceId
      }
    });
    return record;
  },
  aggregateConsumption: async (productId: number, since: Date) => {
    const records = await prisma.consumptionRecord.findMany({
      where: {
        productId,
        timestamp: {
          gte: since
        }
      },
      orderBy: {
        timestamp: "asc"
      }
    });
    return records;
  }
};

