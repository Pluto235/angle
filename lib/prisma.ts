import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
  prismaPool?: pg.Pool;
};

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://angle:angle@localhost:5432/angle?schema=public";

const poolMax = Number.parseInt(process.env.PG_POOL_MAX ?? "10", 10);

const pool =
  globalForPrisma.prismaPool ??
  new pg.Pool({
    connectionString,
    max: Number.isNaN(poolMax) ? 10 : poolMax,
  });

const adapter = globalForPrisma.prismaAdapter ?? new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
  globalForPrisma.prismaPool = pool;
}
