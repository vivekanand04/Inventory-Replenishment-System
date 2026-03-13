import { prisma } from "../prismaClient";

export type AuditContext = {
  name: string;
  productId?: number;
};

export const AuditService = {
  appendEvent: async (context: AuditContext, payload: unknown): Promise<void> => {
    await prisma.auditEvent.create({
      data: {
        productId: context.productId,
        context: context.name,
        payload: payload as object
      }
    });
  }
};

