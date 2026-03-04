import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __clubroomPrisma: PrismaClient | undefined;
}

let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  if (globalThis.__clubroomPrisma) {
    prismaClient = globalThis.__clubroomPrisma;
    return prismaClient;
  }

  prismaClient = new PrismaClient();
  globalThis.__clubroomPrisma = prismaClient;
  return prismaClient;
}

export { PrismaClient };
