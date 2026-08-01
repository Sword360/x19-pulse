import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

let prismaInstance: PrismaClient | undefined;

export function getPrisma(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }
  if (!prismaInstance) {
    try {
      prismaInstance = globalThis.prisma || new PrismaClient();
      if (process.env.NODE_ENV !== 'production') {
        globalThis.prisma = prismaInstance;
      }
    } catch (e) {
      console.warn("Prisma Client initialization skipped:", e);
      return undefined;
    }
  }
  return prismaInstance;
}

export const prisma = getPrisma();
