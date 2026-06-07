import { PrismaClient } from "@prisma/client";

// Singleton Prisma client. Next.js hot-reload would otherwise spawn N clients
// and exhaust the Postgres connection pool. Cache on globalThis in dev only.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
