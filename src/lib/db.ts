import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma Postgres / Vercel provision the connection string under different env
// names (POSTGRES_URL, PRISMA_DATABASE_URL) than the schema's DATABASE_URL.
// Fall back across them so a naming mismatch alone doesn't break production.
const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.PRISMA_DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
