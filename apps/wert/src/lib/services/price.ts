import { z } from 'zod';
import { BigNumber } from 'bignumber.js';
import YahooFinance from 'yahoo-finance2';
import { db } from '@/db';
import { assetDimensions, assetPrices } from '@/db/schema';
import { sql, ilike, or, desc, eq, and } from 'drizzle-orm';
import { loggers } from '@/lib/logger';

const log = loggers.price;

// 1. 定义 Zod 校验 Schema (生产环境的护城河)
const YahooQuoteSchema = z.object({
  symbol: z.string(),
  regularMarketPrice: z.number(),
  currency: z.string().default('USD'),
  regularMarketTime: z.date().optional(),
});

const AssetPriceSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  currency: z.string(),
  date: z.date(),
  source: z.string(),
});

export type AssetPriceType = z.infer<typeof AssetPriceSchema>;


// Timeout for external API calls (in milliseconds)
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

export class AssetPriceService {
  /**
   * Helper to fetch data from Python sidecar with timeout
   */
  private async fetchFromSidecar(endpoint: string, params: Record<string, string>) {
    // Check if sidecar URL is configured
    if (!process.env.DATA_SIDECAR_URL) {
      log.warn("DATA_SIDECAR_URL not configured, skipping sidecar fetch");
      return null;
    }

    try {
      const url = new URL(`${process.env.DATA_SIDECAR_URL}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(url.toString(), {
          headers: {
            'X-API-Key': process.env.INTERNAL_API_KEY || ''
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Sidecar responded with ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        log.error("Sidecar fetch timed out", { endpoint, timeout: FETCH_TIMEOUT_MS });
      } else {
        log.error("Sidecar fetch failed", { endpoint, error: String(error) });
      }
      return null;
    }
  }

  /**
   * 抓取全球股票/ETF价格
   * 修正了过时警告，并加入了 Zod 校验和超时处理
   */
  async fetchGlobalStockPrice(symbol: string) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Yahoo Finance timeout')), FETCH_TIMEOUT_MS);
      });

      // 按照 TS 提示使用方式（或直接使用其默认导出的静态方法，取决于版本，这里采用安全模式）
      const yf = new YahooFinance();
      const fetchPromise = yf.quote(symbol);

      // Race between fetch and timeout
      const rawResult = await Promise.race([fetchPromise, timeoutPromise]);
      if (!rawResult) return null;

      // 使用 Zod 进行运行时校验
      const validated = YahooQuoteSchema.safeParse(rawResult);

      if (!validated.success) {
        log.error("Invalid Yahoo response format", { symbol, error: validated.error.message });
        return null;
      }

      return {
        symbol: validated.data.symbol,
        price: validated.data.regularMarketPrice,
        currency: validated.data.currency,
        date: validated.data.regularMarketTime || new Date(),
        source: 'YahooFinance'
      };
    } catch (error) {
      log.error("Yahoo fetch failed", { symbol, error: String(error) });
      return null;
    }
  }

  /**
   * 获取 A 股数据 (via Python Sidecar)
   */
  async fetchChinaStockPrice(symbol: string) {
    const data = await this.fetchFromSidecar('/api/v1/stock/eod', { symbol });
    if (!data) return null;

    return {
      symbol: data.symbol,
      price: data.price,
      currency: 'CNY',
      date: new Date(data.date),
      source: 'AkShare'
    };
  }

  /**
   * 抓取中国公募基金净值 (via Python Sidecar)
   */
  async fetchChinaFundNav(code: string) {
    // 兼容传入 .OF 后缀的情况
    const cleanCode = code.replace('.OF', '');
    const data = await this.fetchFromSidecar('/api/v1/fund/nav', { code: cleanCode });

    if (!data) return null;

    return {
      symbol: `${cleanCode}.OF`, // 保持内部 ID 一致性
      price: data.price,
      currency: 'CNY',
      date: new Date(data.date),
      source: 'EastMoney'
    };
  }

  /**
   * 计算资产组合逻辑 (保持不变，但内部调用更安全)
   */
  async calculateTotalPortfolioValue(
    holdings: Array<{ symbol: string; quantity: number; type: 'STOCK' | 'FUND' }>,
    baseCurrency: string = 'CNY',
    fxAggregator: any
  ) {
    let totalValue = new BigNumber(0);
    const fxRates = await fxAggregator.getLatest(baseCurrency);

    // 并发处理所有资产请求，提升性能
    const pricePromises = holdings.map(h => {
      // 路由逻辑：中国股票（sh/sz开头）走 Sidecar，其他走 Yahoo
      if (h.type === 'STOCK') {
        if (/^(sh|sz)\d{6}$/i.test(h.symbol)) {
          return this.fetchChinaStockPrice(h.symbol);
        }
        return this.fetchGlobalStockPrice(h.symbol);
      }
      // 基金默认走中国基金接口（目前仅支持中国公募）
      return this.fetchChinaFundNav(h.symbol);
    });

    const prices = await Promise.all(pricePromises);

    holdings.forEach((holding, index) => {
      const assetInfo = prices[index];
      if (!assetInfo) return;

      let assetValueInBase = new BigNumber(assetInfo.price).times(holding.quantity);

      if (assetInfo.currency !== baseCurrency) {
        const rate = fxRates.rates[assetInfo.currency];
        if (rate) {
          // 这里的汇率逻辑应与你的 FXAggregator 基准保持一致
          assetValueInBase = assetValueInBase.div(rate);
        }
      }
      totalValue = totalValue.plus(assetValueInBase);
    });

    return totalValue.toFixed(2);
  }

  /**
   * Unified Routing Logic: Fetch fully typed asset data from best source
   */
  async fetchAsset(symbol: string): Promise<AssetPriceType | null> {
    let normalizedSymbol = symbol;

    // A. Handle .CN (China A-Shares) -> Convert to sh/sz prefix for Sidecar
    if (symbol.endsWith('.CN')) {
      const code = symbol.replace('.CN', '');
      const prefix = code.startsWith('6') ? 'sh' : 'sz';
      normalizedSymbol = `${prefix}${code}`;
      return await this.fetchChinaStockPrice(normalizedSymbol);
    }

    // B. Handle existing sh/sz prefix or suffixes
    if (/^(sh|sz)\d{6}$/i.test(symbol) || symbol.endsWith('.SS') || symbol.endsWith('.SZ')) {
      return await this.fetchChinaStockPrice(symbol);
    }

    // C. Handle China Funds (numeric + maybe .OF)
    if (/^\d{6}(\.OF)?$/i.test(symbol)) {
      return await this.fetchChinaFundNav(symbol);
    }

    // D. Global Stocks (Yahoo Finance)
    // Normalize .US -> remove suffix
    if (symbol.endsWith('.US')) {
      normalizedSymbol = symbol.replace('.US', '');
    }

    if (/[^\w\d\-\.=^]/.test(normalizedSymbol)) {
      log.warn("Skipping invalid global symbol", { symbol });
      return null;
    }

    return await this.fetchGlobalStockPrice(normalizedSymbol);
  }
}

export async function searchSymbols(keyword: string) {
  const normalizedQuery = keyword.toUpperCase();

  // 使用 SQL 的相似度排序，让匹配度最高的排在前面
  // 必须确保 pg_trgm 扩展已开启
  return await db.select({
    symbol: assetDimensions.symbol,
    cnName: assetDimensions.cnName,
    name: assetDimensions.name,
    assetType: assetDimensions.assetType
  })
    .from(assetDimensions)
    .where(or(
      ilike(assetDimensions.symbol, `%${normalizedQuery}%`),
      ilike(assetDimensions.cnName, `%${normalizedQuery}%`),
      ilike(assetDimensions.pinyinAbbr, `%${normalizedQuery}%`)
    ))
    .orderBy(sql`
    GREATEST(
      similarity(${assetDimensions.symbol}, ${normalizedQuery}),
      similarity(${assetDimensions.cnName}, ${normalizedQuery}),
      similarity(${assetDimensions.pinyinAbbr}, ${normalizedQuery})
    ) DESC
  `)
    .limit(10);
}

export type SearchResult = Awaited<ReturnType<typeof searchSymbols>>[number];

// Global singleton
export const priceService = new AssetPriceService();

/**
 * Unified fetcher for stocks and funds with DB Caching (Read-Through)
 *
 * Cache Strategy: Use the most recent price within the last 7 days.
 * This handles weekends and holidays where markets are closed.
 */
export async function fetchPrice(symbol: string): Promise<number | null> {
  // Calculate date range: last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const minDateStr = sevenDaysAgo.toISOString().split('T')[0];

  try {
    // Query the most recent price within the last 7 days
    const cached = await db.select({
      price: assetPrices.price,
      priceDate: assetPrices.priceDate
    })
      .from(assetPrices)
      .where(and(
        eq(assetPrices.symbol, symbol),
        sql`${assetPrices.priceDate} >= ${minDateStr}`
      ))
      .orderBy(desc(assetPrices.priceDate))
      .limit(1);

    if (cached.length > 0) {
      log.debug("Cache hit", { symbol, price: cached[0].price, date: cached[0].priceDate });
      return parseFloat(cached[0].price);
    }
  } catch (e) {
    log.warn("DB cache check failed, falling back to API", { error: String(e) });
  }

  // ...
  // 2. Fallback to Network (Delegate to Service Router)
  try {
    const data = await priceService.fetchAsset(symbol);
    if (!data) return null;

    // 3. Write-Back to Cache (Read-Through)
    await db.insert(assetPrices).values({
      symbol: symbol, // Cache Key
      assetType: data.symbol.includes('.OF') ? 'FUND' : 'STOCK', // Heuristic for now
      price: data.price.toString(),
      currency: data.currency,
      priceDate: data.date.toISOString().split('T')[0],
      source: data.source,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: [assetPrices.symbol, assetPrices.priceDate],
      set: {
        price: data.price.toString(),
        updatedAt: new Date()
      }
    });

    return data.price;

  } catch (error) {
    log.error("Price fetch failed", { symbol, error: String(error) });
    return null;
  }
}