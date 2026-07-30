import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (typeof window === 'undefined') {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({ adapter });
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: ['error', 'warn'],
      });
    }
    prisma = globalForPrisma.prisma;
  }
} else {
  prisma = new PrismaClient();
}

export const db = prisma;
