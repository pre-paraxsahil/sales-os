import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';

  try {
    // Lightweight database query check
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';

    return NextResponse.json(
      {
        status: 'ok',
        app: 'BroStartup Sales OS',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'degraded',
        app: 'BroStartup Sales OS',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
