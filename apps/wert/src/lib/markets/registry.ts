/**
 * 市场 Provider 注册表
 *
 * 统一管理所有市场 Provider，提供：
 * 1. 自动路由 - 根据 symbol 自动选择 Provider
 * 2. 批量操作 - 支持跨市场的统一同步
 * 3. 可扩展 - 运行时动态注册新市场
 */

import { createLogger } from "@/lib/logger";
import type {
  MarketProvider,
  MarketRegistry,
  AssetDimension,
  AssetPrice,
  SyncResult,
  MarketProviderConfig,
} from "./types";

const log = createLogger("markets:registry");

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MarketProviderConfig = {
  enabled: true,
  minMarketCap: 1_000_000_000, // 10 亿美元
  concurrency: 10,
  timeout: 30000,
};

/**
 * 市场注册表单例
 */
class MarketRegistryManager {
  private providers: MarketRegistry = new Map();
  private configs: Map<string, MarketProviderConfig> = new Map();

  /**
   * 注册市场 Provider
   */
  register(provider: MarketProvider, config?: Partial<MarketProviderConfig>): void {
    if (this.providers.has(provider.id)) {
      log.warn("Provider already registered, replacing", { id: provider.id });
    }

    this.providers.set(provider.id, provider);
    this.configs.set(provider.id, { ...DEFAULT_CONFIG, ...config });

    log.info("Provider registered", {
      id: provider.id,
      name: provider.name,
      suffix: provider.symbolSuffix,
    });
  }

  /**
   * 获取所有已注册的 Provider
   */
  getAll(): MarketProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取所有已启用的 Provider
   */
  getEnabled(): MarketProvider[] {
    return this.getAll().filter((p) => this.configs.get(p.id)?.enabled !== false);
  }

  /**
   * 根据 ID 获取 Provider
   */
  get(id: string): MarketProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 获取 Provider 配置
   */
  getConfig(id: string): MarketProviderConfig {
    return this.configs.get(id) || DEFAULT_CONFIG;
  }

  /**
   * 更新 Provider 配置
   */
  updateConfig(id: string, config: Partial<MarketProviderConfig>): void {
    const existing = this.configs.get(id) || DEFAULT_CONFIG;
    this.configs.set(id, { ...existing, ...config });
  }

  /**
   * 根据 symbol 自动路由到对应的 Provider
   * @param symbol 任意格式的 symbol
   * @returns [Provider, 标准化 symbol] 或 null
   */
  route(symbol: string): [MarketProvider, string] | null {
    for (const provider of this.getEnabled()) {
      if (provider.supports(symbol)) {
        const normalized = provider.normalizeSymbol(symbol);
        return [provider, normalized];
      }
    }

    log.warn("No provider found for symbol", { symbol });
    return null;
  }

  /**
   * 获取单个资产价格（自动路由）
   */
  async fetchPrice(symbol: string): Promise<AssetPrice | null> {
    const route = this.route(symbol);
    if (!route) return null;

    const [provider, normalizedSymbol] = route;

    try {
      return await provider.fetchPrice(normalizedSymbol);
    } catch (error) {
      log.error("Price fetch failed", {
        symbol,
        provider: provider.id,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * 同步所有市场的资产字典
   */
  async syncAllDimensions(): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};

    const syncTasks = this.getEnabled().map(async (provider) => {
      const config = this.getConfig(provider.id);
      const startTime = Date.now();

      try {
        log.info("Starting dimension sync", { market: provider.id });

        const dimensions = await provider.fetchDimensions(config);

        results[provider.id] = {
          total: dimensions.length,
          success: dimensions.length,
          failed: 0,
          duration: Date.now() - startTime,
        };

        log.info("Dimension sync completed", {
          market: provider.id,
          count: dimensions.length,
          duration: Date.now() - startTime,
        });

        return dimensions;
      } catch (error) {
        log.error("Dimension sync failed", {
          market: provider.id,
          error: String(error),
        });

        results[provider.id] = {
          total: 0,
          success: 0,
          failed: 1,
          duration: Date.now() - startTime,
        };

        return [];
      }
    });

    await Promise.all(syncTasks);

    return results;
  }

  /**
   * 同步指定市场的资产字典
   */
  async syncDimensions(
    marketId: string,
    config?: Partial<MarketProviderConfig>
  ): Promise<{ dimensions: AssetDimension[]; result: SyncResult }> {
    const provider = this.get(marketId);
    if (!provider) {
      throw new Error(`Unknown market: ${marketId}`);
    }

    const mergedConfig = { ...this.getConfig(marketId), ...config };
    const startTime = Date.now();

    try {
      const dimensions = await provider.fetchDimensions(mergedConfig);

      return {
        dimensions,
        result: {
          total: dimensions.length,
          success: dimensions.length,
          failed: 0,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * 全局单例
 */
export const marketRegistry = new MarketRegistryManager();

/**
 * 辅助函数：注册 Provider
 */
export function registerMarket(
  provider: MarketProvider,
  config?: Partial<MarketProviderConfig>
): void {
  marketRegistry.register(provider, config);
}

/**
 * 辅助函数：根据 symbol 获取价格
 */
export async function fetchPriceBySymbol(symbol: string): Promise<AssetPrice | null> {
  return marketRegistry.fetchPrice(symbol);
}
