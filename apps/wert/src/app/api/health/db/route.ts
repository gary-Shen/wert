import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/db
 * 测试数据库连接
 */
export async function GET() {
  try {
    // 简单查询测试连接
    const result = await db.execute(sql`SELECT 1 as test`);

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      result: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
