import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // No-op seed.
  // Add any initial data creation here if needed, for example:
  // await prisma.product.create({ data: { ... } });
}

main()
  .catch((error) => {
    console.error('Error while running Prisma seed script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

