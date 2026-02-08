/**
 * 汇率服务入口
 * 策略: 缓存优先 → 三角套算 → API 实时获取 → 兜底
 */

import { BigNumber } from "bignumber.js";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchFrankfurterRates } from "./frankfurter";
import { fetchCFETSRates } from "./cfets";

const ANCHOR_CURRENCY = "USD";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const MAJOR_CURRENCIES = ["CNY", "HKD", "JPY", "EUR", "GBP", "SGD", "CAD", "AUD"];

// 开发兜底汇率 (仅防 crash)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.23,
  HKD: 7.82,
  EUR: 0.92,
  JPY: 151.5,
  GBP: 0.79,
  SGD: 1.35,
  CAD: 1.36,
  AUD: 1.53,
};

/**
 * 获取汇率 (from → to)
 * 1. from === to → 1
 * 2. 查 SQLite 缓存 (24h TTL)
 * 3. 三角套算 via USD
 * 4. API 实时获取 (CNY 优先 CFETS)
 * 5. 兜底汇率
 */
export async function getExchangeRate(
  fromCode: string,
  toCode: string
): Promise<number> {
  if (fromCode === toCode) return 1;

  // 1. 直连缓存
  const directRate = await getCachedRate(fromCode, toCode);
  if (directRate !== null) return directRate;

  // 2. 三角套算 via USD
  if (fromCode !== ANCHOR_CURRENCY && toCode !== ANCHOR_CURRENCY) {
    const usdToFrom = await getCachedRate(ANCHOR_CURRENCY, fromCode);
    const usdToTo = await getCachedRate(ANCHOR_CURRENCY, toCode);
    if (usdToFrom !== null && usdToTo !== null && usdToFrom !== 0) {
      return new BigNumber(usdToTo).div(usdToFrom).toNumber();
    }
  } else if (toCode === ANCHOR_CURRENCY) {
    const usdToFrom = await getCachedRate(ANCHOR_CURRENCY, fromCode);
    if (usdToFrom !== null && usdToFrom !== 0) {
      return new BigNumber(1).div(usdToFrom).toNumber();
    }
  } else if (fromCode === ANCHOR_CURRENCY) {
    const usdToTo = await getCachedRate(ANCHOR_CURRENCY, toCode);
    if (usdToTo !== null) return usdToTo;
  }

  // 3. 实时 API 获取
  try {
    // CNY 相关优先尝试 CFETS
    if (fromCode === "CNY" || toCode === "CNY") {
      try {
        const cfetsData = await fetchCFETSRates();
        if (cfetsData.rates["USD"]) {
          // 写入 CNY → USD 缓存
          const cnyToUsd = cfetsData.rates["USD"];
          await cacheRate("CNY", "USD", cnyToUsd);
          // 反向
          await cacheRate("USD", "CNY", 1 / cnyToUsd);

          if (fromCode === "CNY" && toCode === "USD") return cnyToUsd;
          if (fromCode === "USD" && toCode === "CNY") return 1 / cnyToUsd;
        }
      } catch {
        // CFETS 失败，继续 Frankfurter
      }
    }

    const data = await fetchFrankfurterRates(fromCode);
    if (data.rates[toCode] != null) {
      const rate = data.rates[toCode];
      await cacheRate(fromCode, toCode, rate);
      return rate;
    }
  } catch {
    // API 失败，用兜底
  }

  // 4. 兜底
  const fromRate = FALLBACK_RATES[fromCode] || 1;
  const toRate = FALLBACK_RATES[toCode] || 1;
  return new BigNumber(toRate).div(fromRate).toNumber();
}

/**
 * 刷新主要货币对汇率
 * 以 USD 为锚定，拉取并缓存所有主要货币汇率
 */
export async function refreshRates(): Promise<void> {
  try {
    const data = await fetchFrankfurterRates(ANCHOR_CURRENCY);
    for (const currency of MAJOR_CURRENCIES) {
      if (data.rates[currency] != null) {
        await cacheRate(ANCHOR_CURRENCY, currency, data.rates[currency]);
      }
    }
  } catch {
    // 静默失败
  }

  // 同时尝试 CFETS 更新 CNY
  try {
    const cfetsData = await fetchCFETSRates();
    if (cfetsData.rates["USD"]) {
      const cnyToUsd = cfetsData.rates["USD"];
      await cacheRate("CNY", "USD", cnyToUsd);
      await cacheRate("USD", "CNY", 1 / cnyToUsd);
    }
  } catch {
    // 静默失败
  }
}

/**
 * 从 SQLite 缓存获取汇率
 * 24h TTL
 */
async function getCachedRate(
  from: string,
  to: string
): Promise<number | null> {
  try {
    const cached = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to)
        )
      )
      .limit(1);

    const record = cached[0];
    if (record && record.lastUpdated) {
      const lastUpdatedMs =
        record.lastUpdated instanceof Date
          ? record.lastUpdated.getTime()
          : Number(record.lastUpdated) * 1000;
      const isFresh = Date.now() - lastUpdatedMs < ONE_DAY_MS;
      if (isFresh) return record.rate;
    }
  } catch {
    // DB 读取失败，返回 null
  }
  return null;
}

/**
 * 写入汇率缓存
 * 使用 delete + insert（SQLite 无 upsert 唯一约束）
 */
async function cacheRate(
  from: string,
  to: string,
  rate: number
): Promise<void> {
  try {
    // 先删除旧记录
    await db
      .delete(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to)
        )
      );
    // 插入新记录
    await db.insert(exchangeRates).values({
      fromCurrency: from,
      toCurrency: to,
      rate,
      lastUpdated: new Date(),
    });
  } catch {
    // 写入失败静默
  }
}
