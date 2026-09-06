import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Ensures database URL is properly configured for PgBouncer / Supabase serverless poolers.
 * Disables prepared statements (statement_cache_size=0) to prevent "prepared statement already exists" errors.
 */
export function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  const isPooler =
    url.includes('pooler.supabase.com') ||
    url.includes(':6543') ||
    url.includes('pgbouncer=true') ||
    process.env.PRISMA_POOLER_MODE === 'true';

  if (isPooler) {
    let configuredUrl = url;
    const separator = configuredUrl.includes('?') ? '&' : '?';

    if (!configuredUrl.includes('pgbouncer=true')) {
      configuredUrl = `${configuredUrl}${separator}pgbouncer=true`;
    }
    if (!configuredUrl.includes('statement_cache_size=')) {
      const nextSep = configuredUrl.includes('?') ? '&' : '?';
      configuredUrl = `${configuredUrl}${nextSep}statement_cache_size=0`;
    }
    return configuredUrl;
  }

  return url;
}

const dbUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
