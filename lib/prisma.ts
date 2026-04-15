import { PrismaClient } from '@/lib/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma 7 requires a driver adapter for PostgreSQL connections.
// DATABASE_URL is read from prisma.config.ts during migrations and CLI commands,
// but must also be available at runtime for the client.
if (!process.env.DATABASE_URL) {
  // Allow missing DATABASE_URL in test/build environments where DB is not needed
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set');
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pgPool: Pool;
};

function createPrismaClient(): PrismaClient {
  const pool =
    globalForPrisma.pgPool ||
    new Pool({ connectionString: process.env.DATABASE_URL ?? '' });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
