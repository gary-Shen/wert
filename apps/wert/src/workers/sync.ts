/**
 * 资产同步 Worker
 *
 * 基于 Market Provider 架构，统一管理所有市场的数据同步。
 *
 * 架构优势：
 * 1. 统一接口 - 所有市场使用相同的同步逻辑
 * 2. 可扩展 - 新增市场只需注册 Provider
 * 3. 可配置 - 每个市场独立配置
 */

import { loggers } from "@/lib/logger";
import { db } from "../db";
import { assetPrices, assetAccounts, assetDimensions } from "../db/schema";
import { sql, isNotNull } from "drizzle-orm";
import {
  marketRegistry,
  fetchPrice,
  type AssetDimension,
  type SyncResult,
} from "@/lib/markets";

const log = loggers.sync;

// ============================================================================
// 通用工具函数
// ============================================================================

/**
 * 批量插入资产字典到数据库
 */
async function batchInsertDimensions(
  dimensions: AssetDimension[],
  batchSize: number = 500
): Promise<number> {
  let batchCount = 0;

  for (let i = 0; i < dimensions.length; i += batchSize) {
    const chunk = dimensions.slice(i, i + batchSize);

    await db
      .insert(assetDimensions)
      .values(
        chunk.map((item) => ({
          symbol: item.symbol,
          assetType: item.assetType === "ETF" ? "FUND" : item.assetType,
          cnName: item.cnName,
          name: item.name || null,
          pinyin: null,
          pinyinAbbr: item.pinyinAbbr || item.symbol.split(".")[0],
          isActive: true,
        }))
      )
      .onConflictDoUpdate({
        target: [assetDimensions.symbol],
        set: {
          cnName: sql`excluded."cnName"`,
          name: sql`excluded."name"`,
          pinyinAbbr: sql`excluded."pinyinAbbr"`,
          assetType: sql`excluded."assetType"`,
          isActive: true,
        },
      });

    batchCount++;
  }

  return batchCount;
}

// ============================================================================
// 价格同步
// ============================================================================

/**
 * 同步用户持仓的资产价格
 *
 * 流程：
 * 1. 查询所有活跃持仓的 symbol
 * 2. 通过 Market Registry 自动路由到对应 Provider
 * 3. 批量更新价格缓存
 */
export async function syncPriceWorker(): Promise<SyncResult> {
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
      // 使用 Market Registry 自动路由
      const data = await fetchPrice(symbol);

      if (!data) {
        log.warn("Skipped asset: no data returned", { symbol });
        skipped++;
        continue;
      }

      // Upsert 到价格缓存
      await db
        .insert(assetPrices)
        .values({
          symbol: data.symbol,
          assetType: data.symbol.includes(".OF") ? "FUND" : "STOCK",
          price: data.price.toString(),
          currency: data.currency || "CNY",
          priceDate: data.priceDate.toISOString().split("T")[0],
          source: data.source,
        })
        .onConflictDoUpdate({
          target: [assetPrices.symbol, assetPrices.priceDate],
          set: {
            price: data.price.toString(),
            updatedAt: new Date(),
          },
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
    skipped,
  };
}

// ============================================================================
// 资产字典同步 - 单个市场
// ============================================================================

/**
 * 同步指定市场的资产字典
 *
 * @param marketId 市场 ID: "CN", "US", "HK" 等
 * @param options 配置选项
 */
export async function syncMarketDimensions(
  marketId: string,
  options?: { minMarketCap?: number }
): Promise<SyncResult & { batches: number }> {
  const provider = marketRegistry.get(marketId);

  if (!provider) {
    throw new Error(`Unknown market: ${marketId}`);
  }

  const config = {
    ...marketRegistry.getConfig(marketId),
    ...options,
  };

  log.info("Starting market dimensions sync", { market: marketId, config });

  const startTime = Date.now();

  try {
    // 从 Provider 获取数据
    const dimensions = await provider.fetchDimensions(config);

    if (dimensions.length === 0) {
      log.warn("No dimensions returned", { market: marketId });
      return {
        total: 0,
        success: 0,
        failed: 0,
        batches: 0,
        duration: Date.now() - startTime,
      };
    }

    // 批量插入数据库
    const batches = await batchInsertDimensions(dimensions);

    log.info("Market dimensions sync completed", {
      market: marketId,
      total: dimensions.length,
      batches,
      duration: Date.now() - startTime,
    });

    return {
      total: dimensions.length,
      success: dimensions.length,
      failed: 0,
      batches,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    log.error("Market dimensions sync failed", {
      market: marketId,
      error: String(error),
    });
    throw error;
  }
}

// ============================================================================
// 资产字典同步 - 兼容旧 API
// ============================================================================

/**
 * 同步中国 A 股/基金资产字典
 * @deprecated 使用 syncMarketDimensions("CN") 替代
 */
export async function syncAssetDimensions(): Promise<{
  total: number;
  batches: number;
}> {
  const result = await syncMarketDimensions("CN");
  return { total: result.total, batches: result.batches };
}

/**
 * 同步美股/ETF 资产字典
 * @deprecated 使用 syncMarketDimensions("US", { minMarketCap }) 替代
 */
export async function syncOverseasAssetDimensions(
  minMarketCap: number = 1_000_000_000
): Promise<{
  total: number;
  filtered: number;
  batches: number;
}> {
  const result = await syncMarketDimensions("US", { minMarketCap });
  return {
    total: result.total,
    filtered: result.success, // 筛选后数量
    batches: result.batches,
  };
}

/**
 * 同步港股资产字典
 * @deprecated 使用 syncMarketDimensions("HK") 替代
 */
export async function syncHKAssetDimensions(): Promise<{
  total: number;
  batches: number;
}> {
  const result = await syncMarketDimensions("HK");
  return { total: result.total, batches: result.batches };
}

// ============================================================================
// 资产字典同步 - 全量
// ============================================================================

/**
 * 同步所有市场的资产字典
 *
 * @param options 配置选项
 */
export async function syncAllAssetDimensions(
  options?: { minMarketCap?: number }
): Promise<Record<string, SyncResult & { batches: number }>> {
  const minMarketCap = options?.minMarketCap ?? 1_000_000_000;

  log.info("Starting full asset dimensions sync", { minMarketCap });

  const enabledProviders = marketRegistry.getEnabled();
  const results: Record<string, SyncResult & { batches: number }> = {};

  // 并行同步所有市场
  const syncTasks = enabledProviders.map(async (provider) => {
    try {
      const result = await syncMarketDimensions(provider.id, {
        minMarketCap: provider.id === "US" ? minMarketCap : undefined,
      });
      results[provider.id.toLowerCase()] = result;
    } catch (error) {
      log.error("Market sync failed", {
        market: provider.id,
        error: String(error),
      });
      results[provider.id.toLowerCase()] = {
        total: 0,
        success: 0,
        failed: 1,
        batches: 0,
      };
    }
  });

  await Promise.all(syncTasks);

  log.info("Full asset dimensions sync completed", { results });

  return results;
}

// ============================================================================
// 新 API - 推荐使用
// ============================================================================

/**
 * 获取所有已注册的市场
 */
export function getRegisteredMarkets() {
  return marketRegistry.getAll().map((p) => ({
    id: p.id,
    name: p.name,
    suffix: p.symbolSuffix,
    currency: p.defaultCurrency,
    enabled: marketRegistry.getConfig(p.id).enabled,
  }));
}

/**
 * 启用/禁用市场
 */
export function setMarketEnabled(marketId: string, enabled: boolean) {
  marketRegistry.updateConfig(marketId, { enabled });
}

/**
 * 更新市场配置
 */
export function updateMarketConfig(
  marketId: string,
  config: { minMarketCap?: number; enabled?: boolean }
) {
  marketRegistry.updateConfig(marketId, config);
}
