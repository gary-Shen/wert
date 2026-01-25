import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { FXAggregator } from "./aggregator";
import { FrankfurterProvider } from "./frankfurter.provider";
import { CFETSProvider } from "./cfets.provider";
import { BigNumber } from "bignumber.js";
import { loggers } from "@/lib/logger";

const log = loggers.currency.index;

const ANCHOR_CURRENCY = "USD";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 开发环境 Mock rates (仅用于开发/测试)
// 生产环境不使用此兜底，而是明确报错
const DEV_MOCK_RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.23,
  HKD: 7.82,
  EUR: 0.92,
  JPY: 151.5,
  GBP: 0.79,
  SGD: 1.35,
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Initialize Aggregator with free providers
const aggregator = new FXAggregator([
  new FrankfurterProvider(),
  new CFETSProvider()
]);

/**
 * 获取任意货币对的即时汇率 (From -> To)
 * 策略：
 * 1. 查直连缓存 (From -> To)
 * 2. 查锚点缓存 (USD -> From, USD -> To) 进行三角套算
 * 3. 实时 API (尝试直接获取)
 * 4. 开发环境 Mock 兜底 / 生产环境抛出错误
 *
 * @returns BigNumber 汇率对象，避免精度丢失
 * @throws Error 生产环境下无法获取汇率时抛出错误
 */
export async function getExchangeRate(fromCode: string, toCode: string = "CNY"): Promise<BigNumber> {
  if (fromCode === toCode) return new BigNumber(1);

  // 1. Try Direct DB Cache
  const directRate = await getCachedRate(fromCode, toCode);
  if (directRate !== null) return new BigNumber(directRate);

  // 2. Try Triangulation via Anchor (USD)
  // Rate(From -> To) = Rate(USD -> To) / Rate(USD -> From)
  // 前提：数据库中存的是 USD -> Currency 的汇率
  if (fromCode !== ANCHOR_CURRENCY && toCode !== ANCHOR_CURRENCY) {
    const usdToFrom = await getCachedRate(ANCHOR_CURRENCY, fromCode);
    const usdToTo = await getCachedRate(ANCHOR_CURRENCY, toCode);

    // usdToFrom means 1 USD = X FromCurrency
    if (usdToFrom !== null && usdToTo !== null && !usdToFrom.isZero()) {
      return usdToTo.div(usdToFrom);
    }
  } else if (toCode === ANCHOR_CURRENCY) {
    // Trying to find X -> USD. If we have USD -> X, then X -> USD = 1 / (USD -> X)
    const usdToFrom = await getCachedRate(ANCHOR_CURRENCY, fromCode);
    if (usdToFrom !== null && !usdToFrom.isZero()) {
      return new BigNumber(1).div(usdToFrom);
    }
  }

  // 3. Fetch from Aggregator (Real-time fallback)
  log.info("Cache miss, fetching from aggregator", { pair: `${fromCode}->${toCode}` });

  try {
    const data = await aggregator.getAggregatedRates(fromCode);
    if (data.rates && typeof data.rates[toCode] === 'number') {
      const rate = new BigNumber(data.rates[toCode]);
      // 异步写入缓存
      cacheRate(fromCode, toCode, rate).catch(err => log.error("Failed to cache rate", { error: String(err) }));
      return rate;
    }
  } catch (e) {
    log.error("Failed to fetch exchange rate", { pair: `${fromCode}->${toCode}`, error: String(e) });
  }

  // 4. Fallback: 生产环境抛出错误，开发环境使用 Mock
  if (IS_PRODUCTION) {
    throw new Error(
      `Failed to get exchange rate ${fromCode}->${toCode}. ` +
      `No cached data available and API fetch failed.`
    );
  }

  // 开发环境 Mock 兜底
  log.warn("Using mock rates - NOT FOR PRODUCTION", { pair: `${fromCode}->${toCode}` });

  const fromRate = new BigNumber(DEV_MOCK_RATES[fromCode] || 1);
  const toRate = new BigNumber(DEV_MOCK_RATES[toCode] || 1);
  return toRate.div(fromRate);
}

/**
 * Helper: Get cached rate (Returned as BigNumber or null)
 */
async function getCachedRate(from: string, to: string): Promise<BigNumber | null> {
  const cached = await db.select().from(exchangeRates).where(
    and(eq(exchangeRates.fromCurrency, from), eq(exchangeRates.toCurrency, to))
  ).limit(1);

  const record = cached[0];
  if (record && record.lastUpdated) {
    const isFresh = (new Date().getTime() - record.lastUpdated.getTime()) < ONE_DAY_MS;
    if (isFresh) return new BigNumber(record.rate);
  }
  return null;
}

/**
 * Helper: Cache rate
 */
async function cacheRate(from: string, to: string, rate: BigNumber | number) {
  const rateStr = rate.toString();
  await db.insert(exchangeRates).values({
    fromCurrency: from,
    toCurrency: to,
    rate: rateStr,
    lastUpdated: new Date(),
  }).onConflictDoUpdate({
    target: [exchangeRates.fromCurrency, exchangeRates.toCurrency],
    set: { rate: rateStr, lastUpdated: new Date() },
  });
}

/**
 * 强制刷新主要货币的汇率 (用于定时任务)
 * 策略：以 USD 为基准，拉取主要货币汇率。
 * 存储：USD -> X
 *
 * @throws Error 当刷新失败时抛出错误，确保 cron job 能正确报告失败状态
 */
export async function refreshExchangeRates(): Promise<{ updated: number; failed: string[] }> {
  const MAJOR_CURRENCIES = ["CNY", "HKD", "JPY", "EUR", "GBP", "SGD", "CAD", "AUD"];
  const TARGET_BASE = ANCHOR_CURRENCY; // USD

  log.info("Starting currency sync", { base: TARGET_BASE, currencies: MAJOR_CURRENCIES });

  const data = await aggregator.getAggregatedRates(TARGET_BASE);
  if (!data || !data.rates) {
    throw new Error("No data returned from aggregator");
  }

  let updated = 0;
  const failed: string[] = [];

  for (const currency of MAJOR_CURRENCIES) {
    const rateVal = data.rates[currency];
    if (typeof rateVal === 'number') {
      const rate = new BigNumber(rateVal);
      await cacheRate(TARGET_BASE, currency, rate);
      updated++;
      log.debug("Rate updated", { pair: `${TARGET_BASE}->${currency}`, rate: rate.toString() });
    } else {
      failed.push(currency);
      log.warn("Missing rate for currency", { currency });
    }
  }

  // 如果所有货币都失败，抛出错误
  if (updated === 0) {
    throw new Error(`All currency rates failed to update: ${failed.join(", ")}`);
  }

  return { updated, failed };
}
