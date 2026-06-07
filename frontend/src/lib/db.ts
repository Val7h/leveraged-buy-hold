import { PrismaClient } from "@prisma/client";

// Singleton Prisma client. Next.js hot-reload would otherwise spawn N clients
// and exhaust the Postgres connection pool. Cache on globalThis in dev only.
//
// Modo demo: se DATABASE_URL não estiver configurada, expomos um proxy que
// sempre lança um erro claro em vez de explodir no import. Permite o app
// subir sem DB e as páginas que não usam Prisma continuarem funcionando.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeStubClient(): PrismaClient {
  const handler: ProxyHandler<PrismaClient> = {
    get() {
      throw new Error(
        "Banco de dados não configurado. Defina DATABASE_URL para habilitar auth/persistência."
      );
    },
  };
  return new Proxy({} as unknown as PrismaClient, handler);
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL
    ? new PrismaClient({ log: ["error"] })
    : makeStubClient());

if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
