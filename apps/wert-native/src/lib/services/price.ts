/**
 * 资产报价服务
 * 支持全球股票 (Yahoo Finance)、A 股 (东方财富)、基金 (天天基金)
 * 缓存策略: 交易时段 5min TTL, 非交易 2h TTL
 */

import { db } from "@/db";
import { assetPrices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const FETCH_TIMEOUT_MS = 10000; // 10s

export interface PriceResult {
  price: number;
  currency: string;
}

/**
 * 获取资产报价 (带缓存)
 * @param symbol 资产代码
 * @param market 市场标识 (US/HK/CN)
 * @returns 价格和币种，失败返回 null
 */
export async function fetchPrice(
  symbol: string,
  market?: string | null
): Promise<PriceResult | null> {
  // 1. 查缓存
  const cached = await getCachedPrice(symbol);
  if (cached !== null) return cached;

  // 2. 按市场路由获取
  let result: PriceResult | null = null;

  try {
    if (market === "CN" || isChinaSymbol(symbol)) {
      if (isFundSymbol(symbol)) {
        result = await fetchChinaFundNav(symbol);
      } else {
        result = await fetchChinaStock(symbol);
      }
    } else {
      result = await fetchYahooPrice(symbol);
    }
  } catch {
    // 网络失败返回 null
  }

  // 3. 写入缓存
  if (result) {
    await cachePrice(symbol, result, market);
  }

  return result;
}

/**
 * Yahoo Finance 全球股票报价
 * 支持 US/HK/全球市场
 */
async function fetchYahooPrice(symbol: string): Promise<PriceResult | null> {
  // 清理 symbol: 移除 .US 后缀
  let cleanSymbol = symbol;
  if (cleanSymbol.endsWith(".US")) {
    cleanSymbol = cleanSymbol.replace(".US", "");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const currency = meta.currency || "USD";

    if (typeof price !== "number" || price <= 0) return null;

    return { price, currency };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 东方财富 A 股报价
 * 使用公开 HTTP API
 */
async function fetchChinaStock(symbol: string): Promise<PriceResult | null> {
  // 转换代码格式: 600519 → 1.600519 (上海), 000001 → 0.000001 (深圳)
  const cleanCode = symbol.replace(/^(sh|sz)/i, "").replace(/\.(SS|SZ|CN)$/i, "");
  const prefix = cleanCode.startsWith("6") || cleanCode.startsWith("9") ? "1" : "0";
  const secId = `${prefix}.${cleanCode}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=f43,f44,f45,f46,f47,f48,f50,f57,f58,f170&ut=fa5fd1943c7b386f172d6893dbbd1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const info = data?.data;
    if (!info) return null;

    // f43 = 最新价 (单位：分，需要除以 100；但实际 API 已经是元)
    // 东方财富 push2 API 的 f43 需要除以 1000 或根据实际返回判断
    let price = info.f43;
    if (typeof price !== "number" || price <= 0) return null;

    // 东方财富 API f43 返回的是去小数的价格，需要除以 100
    price = price / 100;

    return { price, currency: "CNY" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 天天基金 NAV 查询
 */
async function fetchChinaFundNav(symbol: string): Promise<PriceResult | null> {
  const cleanCode = symbol.replace(/\.OF$/i, "");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://fundgz.1702.com/js/${cleanCode}.js`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const text = await response.text();
    // 响应格式: jsonpgz({"fundcode":"000001","name":"...","jzrq":"2024-01-01","dwjz":"1.0234",...});
    const jsonStr = text.replace(/^jsonpgz\(/, "").replace(/\);?$/, "");
    const data = JSON.parse(jsonStr);

    const price = parseFloat(data.dwjz);
    if (isNaN(price) || price <= 0) return null;

    return { price, currency: "CNY" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- 辅助函数 ---

function isChinaSymbol(symbol: string): boolean {
  return (
    /^(sh|sz)\d{6}$/i.test(symbol) ||
    /\.(SS|SZ|CN)$/i.test(symbol) ||
    /^\d{6}(\.OF)?$/.test(symbol)
  );
}

function isFundSymbol(symbol: string): boolean {
  return /^\d{6}\.OF$/i.test(symbol) || /^\d{6}$/.test(symbol.replace(/^(sh|sz)/i, ""));
}

/**
 * 获取缓存的价格
 * 交易时段 (工作日 9:30-15:00 CST) 5min TTL, 否则 2h TTL
 */
async function getCachedPrice(symbol: string): Promise<PriceResult | null> {
  try {
    const cached = await db
      .select()
      .from(assetPrices)
      .where(eq(assetPrices.symbol, symbol))
      .orderBy(desc(assetPrices.updatedAt))
      .limit(1);

    const record = cached[0];
    if (!record) return null;

    const updatedMs =
      record.updatedAt instanceof Date
        ? record.updatedAt.getTime()
        : Number(record.updatedAt) * 1000;

    const ttl = isTradingHours() ? 5 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const isFresh = Date.now() - updatedMs < ttl;

    if (isFresh) {
      return { price: record.price, currency: record.currency };
    }
  } catch {
    // DB 读取失败
  }
  return null;
}

/**
 * 写入价格缓存
 */
async function cachePrice(
  symbol: string,
  result: PriceResult,
  market?: string | null
): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const assetType = isFundSymbol(symbol) ? "FUND" : "STOCK";
    const source =
      market === "CN" || isChinaSymbol(symbol)
        ? isFundSymbol(symbol)
          ? "TianTianFund"
          : "EastMoney"
        : "YahooFinance";

    // 先删除同 symbol 同日期的旧记录
    await db
      .delete(assetPrices)
      .where(
        and(
          eq(assetPrices.symbol, symbol),
          eq(assetPrices.priceDate, today)
        )
      );

    await db.insert(assetPrices).values({
      symbol,
      assetType,
      price: result.price,
      currency: result.currency,
      priceDate: today,
      source,
      updatedAt: new Date(),
    });
  } catch {
    // 静默失败
  }
}

/**
 * 判断是否在交易时段
 * 简化判断: 工作日 UTC+8 9:30-15:00
 */
function isTradingHours(): boolean {
  const now = new Date();
  const utc8Hour = (now.getUTCHours() + 8) % 24;
  const day = now.getUTCDay();

  // 周末
  if (day === 0 || day === 6) return false;

  // 9:30 ~ 15:00
  if (utc8Hour >= 10 && utc8Hour < 15) return true;
  if (utc8Hour === 9 && now.getUTCMinutes() >= 30) return true;

  return false;
}
