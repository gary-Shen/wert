import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { assetPrices } from '@/db/schema';
import { sql, eq, and, desc } from 'drizzle-orm';
import { priceService } from '@/lib/services/price';
import { loggers } from '@/lib/logger';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const log = loggers.price;

// 缓存有效期配置（秒）
const CACHE_TTL = {
  STOCK_TRADING: 2 * 60,      // 盘中：2分钟
  STOCK_CLOSED: 30 * 60,      // 盘后：30分钟
  FUND: 6 * 60 * 60,          // 基金：6小时
};

// 判断是否为A股交易时间
function isTradingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();

  // 周末休市
  if (day === 0 || day === 6) return false;

  // 上午 9:30-11:30
  if (hour === 9 && minute >= 30) return true;
  if (hour === 10) return true;
  if (hour === 11 && minute <= 30) return true;

  // 下午 13:00-15:00
  if (hour >= 13 && hour < 15) return true;

  return false;
}

// 判断价格是否需要刷新
function needsRefresh(priceDate: string, symbol: string): boolean {
  const isFund = symbol.endsWith('.OF') || /^\d{6}$/.test(symbol);
  const ttl = isFund ? CACHE_TTL.FUND : (isTradingHours() ? CACHE_TTL.STOCK_TRADING : CACHE_TTL.STOCK_CLOSED);

  const priceTime = new Date(priceDate);
  const now = new Date();
  const ageMs = now.getTime() - priceTime.getTime();

  return ageMs > ttl * 1000;
}

/**
 * GET /api/prices?symbols=sh600519,000001.OF
 *
 * 智能价格获取 API (Stale-While-Revalidate 模式)
 *
 * 1. 从数据库读取缓存价格（即使过期也返回）
 * 2. 判断是否需要刷新
 * 3. 如需刷新，异步调用 Finance Sidecar 更新
 * 4. 立即返回已有数据
 */
export async function GET(request: NextRequest) {
  // 鉴权：检查用户登录状态
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const symbolsParam = request.nextUrl.searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter is required' }, { status: 400 });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No valid symbols provided' }, { status: 400 });
  }

  if (symbols.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 symbols per request' }, { status: 400 });
  }

  try {
    // 1. 从数据库批量查询价格（最近7天内的最新价格）
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const minDateStr = sevenDaysAgo.toISOString().split('T')[0];

    const prices: Record<string, {
      price: number;
      currency: string;
      date: string;
      source: string;
      stale: boolean;
    }> = {};

    const symbolsToRefresh: string[] = [];

    for (const symbol of symbols) {
      const cached = await db.select({
        price: assetPrices.price,
        currency: assetPrices.currency,
        priceDate: assetPrices.priceDate,
        source: assetPrices.source,
      })
        .from(assetPrices)
        .where(and(
          eq(assetPrices.symbol, symbol),
          sql`${assetPrices.priceDate} >= ${minDateStr}`
        ))
        .orderBy(desc(assetPrices.priceDate))
        .limit(1);

      if (cached.length > 0) {
        const { price, currency, priceDate, source } = cached[0];
        const stale = needsRefresh(priceDate, symbol);

        prices[symbol] = {
          price: parseFloat(price),
          currency,
          date: priceDate,
          source,
          stale,
        };

        if (stale) {
          symbolsToRefresh.push(symbol);
        }
      } else {
        // 没有缓存，需要立即获取
        symbolsToRefresh.push(symbol);
      }
    }

    // 2. 异步刷新过期/缺失的价格（不阻塞响应）
    if (symbolsToRefresh.length > 0) {
      // 使用 waitUntil 或后台任务刷新
      // 注意：Next.js edge runtime 不支持 waitUntil，这里改为同步刷新缺失的价格
      const missingSymbols = symbolsToRefresh.filter(s => !prices[s]);

      if (missingSymbols.length > 0) {
        log.info(`Fetching ${missingSymbols.length} missing prices`);

        for (const symbol of missingSymbols) {
          try {
            const data = await priceService.fetchAsset(symbol);
            if (data) {
              prices[symbol] = {
                price: data.price,
                currency: data.currency,
                date: data.date.toISOString().split('T')[0],
                source: data.source,
                stale: false,
              };

              // 写入数据库
              await db.insert(assetPrices).values({
                symbol,
                assetType: symbol.includes('.OF') ? 'FUND' : 'STOCK',
                price: data.price.toString(),
                currency: data.currency,
                priceDate: data.date.toISOString().split('T')[0],
                source: data.source,
                updatedAt: new Date(),
              }).onConflictDoUpdate({
                target: [assetPrices.symbol, assetPrices.priceDate],
                set: {
                  price: data.price.toString(),
                  updatedAt: new Date(),
                },
              });
            }
          } catch (error) {
            log.error(`Failed to fetch price for ${symbol}`, { error: String(error) });
          }
        }
      }

      // 对于已有但过期的价格，返回后异步刷新
      // （这里简化处理，实际可使用队列或后台任务）
      const staleOnly = symbolsToRefresh.filter(s => prices[s]);
      if (staleOnly.length > 0) {
        log.debug(`${staleOnly.length} prices are stale, will refresh in background`);
        // 后台刷新逻辑可以通过调用 /api/cron/sync-prices 或消息队列实现
      }
    }

    return NextResponse.json({
      success: Object.keys(prices).length,
      missing: symbols.filter(s => !prices[s]),
      prices,
    });

  } catch (error) {
    log.error('Price API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
