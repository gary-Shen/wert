import { priceService } from "@/lib/services/price";
import { loggers } from "@/lib/logger";
import { db } from "../db";
import { assetPrices, assetAccounts, assetDimensions } from "../db/schema";
import { sql, isNotNull } from "drizzle-orm";

const log = loggers.sync;

// 环境变量校验
function validateEnvVars(): { sidecarUrl: string; apiKey: string } {
  const sidecarUrl = process.env.DATA_SIDECAR_URL;
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!sidecarUrl) {
    throw new Error("Missing required environment variable: DATA_SIDECAR_URL");
  }
  if (!apiKey) {
    throw new Error("Missing required environment variable: INTERNAL_API_KEY");
  }

  return { sidecarUrl, apiKey };
}

// 带超时的 fetch 封装
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 指数退避重试
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) break;

      // 指数退避 + 抖动
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );

      log.warn("Retry attempt", {
        attempt: attempt + 1,
        maxRetries,
        delay_ms: Math.round(delay),
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const syncPriceWorker = async (): Promise<{ total: number; success: number; failed: number; skipped: number }> => {
  // 1. 获取所有活跃持仓的 unique symbol
  const activeAssets = await db
    .selectDistinct({ symbol: assetAccounts.symbol })
    .from(assetAccounts)
    .where(isNotNull(assetAccounts.symbol));

  log.info("Found active assets to sync", { count: activeAssets.length });

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const { symbol } of activeAssets) {
    if (!symbol) {
      skipped++;
      continue;
    }

    try {
      const data = await priceService.fetchAsset(symbol);

      if (!data) {
        log.warn("Skipped asset: no data returned", { symbol });
        skipped++;
        continue;
      }

      // 3. 执行 Upsert 落盘
      await db.insert(assetPrices).values({
        symbol: data.symbol, // 使用返回的标准 symbol
        assetType: data.symbol.includes('.OF') ? 'FUND' : 'STOCK', // Heuristic for now
        price: data.price.toString(),
        currency: data.currency || 'CNY',
        priceDate: data.date.toISOString().split('T')[0],
        source: data.source
      }).onConflictDoUpdate({
        target: [assetPrices.symbol, assetPrices.priceDate],
        set: {
          price: data.price.toString(),
          updatedAt: new Date()
        }
      });

      success++;
      log.debug("Price synced", { symbol, price: data.price });

    } catch (err) {
      log.error("Asset sync failed", { symbol, error: String(err) });
      failed++;
    }
  }

  return {
    total: activeAssets.length,
    success,
    failed,
    skipped
  };
};

/**
 * 同步资产字典 (每周一次)
 * 从 Python Sidecar 拉取全量 A 股和基金数据，存入 Postgres
 *
 * @throws Error 当同步失败时抛出错误
 */
export const syncAssetDimensions = async (): Promise<{ total: number; batches: number }> => {
  // 1. 校验环境变量
  const { sidecarUrl, apiKey } = validateEnvVars();

  log.info("Starting asset dimensions sync");

  // 2. 带超时和重试的 fetch
  const data = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${sidecarUrl}/api/v1/dim`,
        { headers: { "X-API-Key": apiKey } },
        30000 // 30s 超时
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch dimensions: ${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    { maxRetries: 3, baseDelayMs: 2000 }
  );

  if (!Array.isArray(data)) {
    throw new Error(`Invalid response format: expected array, got ${typeof data}`);
  }

  if (data.length === 0) {
    log.warn("No data received for dimensions");
    return { total: 0, batches: 0 };
  }

  log.info("Fetched dimension records", { count: data.length });

  // 3. 批量插入
  const BATCH_SIZE = 1000;
  let batchCount = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);

    await db.insert(assetDimensions).values(
      chunk.map((item: any) => ({
        symbol: item.symbol,
        assetType: item.assetType,
        cnName: item.name,
        pinyin: item.pinyin,
        pinyinAbbr: item.pinyinAbbr,
        isActive: true
      }))
    ).onConflictDoUpdate({
      target: [assetDimensions.symbol],
      set: {
        cnName: sql`excluded."cnName"`,
        pinyin: sql`excluded."pinyin"`,
        pinyinAbbr: sql`excluded."pinyinAbbr"`,
        assetType: sql`excluded."assetType"`,
        isActive: true
      }
    });

    batchCount++;
  }

  log.info("Asset dimensions sync completed", { total: data.length, batches: batchCount });

  return { total: data.length, batches: batchCount };
};