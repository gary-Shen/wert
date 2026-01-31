import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { assetDimensions } from '@/db/schema';
import { sql, ilike, or } from 'drizzle-orm';
import { loggers } from '@/lib/logger';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const log = loggers.price;

/**
 * GET /api/search?q=maotai&limit=10
 *
 * 本地搜索 API（使用 PostgreSQL trigram 索引）
 *
 * 支持:
 * - 代码搜索: sh600519, 600519
 * - 名称搜索: 贵州茅台, 茅台
 * - 拼音搜索: maotai, mt, gzmt
 */
export async function GET(request: NextRequest) {
  // 鉴权：检查用户登录状态
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get('q');
  const limitParam = request.nextUrl.searchParams.get('limit');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
  }

  const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);
  const normalizedQuery = query.trim().toUpperCase();

  try {
    // 使用 PostgreSQL trigram 索引进行模糊搜索
    // 注意：需要确保数据库已启用 pg_trgm 扩展
    const results = await db.select({
      symbol: assetDimensions.symbol,
      cnName: assetDimensions.cnName,
      name: assetDimensions.name,
      assetType: assetDimensions.assetType,
      pinyinAbbr: assetDimensions.pinyinAbbr,
    })
      .from(assetDimensions)
      .where(or(
        ilike(assetDimensions.symbol, `%${normalizedQuery}%`),
        ilike(assetDimensions.cnName, `%${query}%`),
        ilike(assetDimensions.pinyinAbbr, `%${normalizedQuery}%`),
      ))
      .orderBy(sql`
        GREATEST(
          similarity(${assetDimensions.symbol}, ${normalizedQuery}),
          similarity(${assetDimensions.cnName}, ${query}),
          similarity(${assetDimensions.pinyinAbbr}, ${normalizedQuery})
        ) DESC
      `)
      .limit(limit);

    return NextResponse.json({
      query,
      count: results.length,
      results: results.map(r => ({
        symbol: r.symbol,
        name: r.cnName,
        englishName: r.name,
        assetType: r.assetType,
        pinyinAbbr: r.pinyinAbbr,
      })),
    });

  } catch (error) {
    log.error('Search API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
