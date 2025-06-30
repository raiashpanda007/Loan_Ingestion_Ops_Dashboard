import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

 const Prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'], 
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = Prisma;
}


export default Prisma;