import { AlertLevel } from "shared";
import { prisma } from "../prismaClient";
import { logger } from "../logging";

export const AlertService = {
  createAlert: async (productId: number, level: AlertLevel, message: string): Promise<void> => {
    await prisma.alert.create({
      data: {
        productId,
        level,
        message
      }
    });
    logger.info("Alert created", { productId, level, message });
  },
  sendNotification: async (productId: number, level: AlertLevel, message: string): Promise<void> => {
    logger.info("Alert notification stub", { productId, level, message });
  }
};

