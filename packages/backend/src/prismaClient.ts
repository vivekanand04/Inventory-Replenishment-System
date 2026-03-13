import { PrismaClient, Prisma } from "@prisma/client";

export const prisma = new PrismaClient();

export const withAdvisoryLock = async <T>(productId: number, fn: () => Promise<T>): Promise<T> => {
  return await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock($1)", productId);
    const result = await fn();
    return result;
  });
};

export const withSerializableTransaction = async <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  return await prisma.$transaction(async tx => {
    const result = await fn(tx);
    return result;
  }, { isolationLevel: "Serializable" });
};

