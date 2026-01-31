/**
 * 金融市场统一入口
 *
 * 使用方式：
 *
 * 1. 获取价格（自动路由）：
 *    import { fetchPrice } from "@/lib/markets";
 *    const price = await fetchPrice("AAPL");  // 自动识别美股
 *    const price = await fetchPrice("0700.HK");  // 港股
 *
 * 2. 同步资产字典：
 *    import { syncMarketDimensions, syncAllMarkets } from "@/lib/markets";
 *    await syncMarketDimensions("US");  // 仅美股
 *    await syncAllMarkets();  // 全部市场
 *
 * 3. 添加新市场：
 *    见 docs/adding-new-market.md 或参考现有 Provider
 */

export * from "./types";
export * from "./registry";

// 导出所有 Provider
export { usMarketProvider } from "./providers/us.provider";
export { hkMarketProvider } from "./providers/hk.provider";
export { cnMarketProvider } from "./providers/cn.provider";

// 初始化注册
import { registerMarket, marketRegistry } from "./registry";
import { usMarketProvider } from "./providers/us.provider";
import { hkMarketProvider } from "./providers/hk.provider";
import { cnMarketProvider } from "./providers/cn.provider";

/**
 * 注册所有市场 Provider
 *
 * 注册顺序决定了路由优先级：
 * - 后注册的 Provider 优先匹配
 * - 建议：更具体的市场放前面
 */
function initializeMarkets() {
  // 中国市场（最具体的匹配规则）
  registerMarket(cnMarketProvider, {
    enabled: true,
    // Sidecar 已有全量数据，无需筛选
  });

  // 港股市场
  registerMarket(hkMarketProvider, {
    enabled: true,
    // 预定义列表，无筛选
  });

  // 美股市场（兜底，匹配规则最宽松）
  registerMarket(usMarketProvider, {
    enabled: true,
    minMarketCap: 1_000_000_000, // 默认仅同步市值 >=10 亿
  });
}

// 自动初始化
initializeMarkets();

/**
 * 快捷方法：获取价格
 */
export async function fetchPrice(symbol: string) {
  return marketRegistry.fetchPrice(symbol);
}

/**
 * 快捷方法：同步指定市场
 */
export async function syncMarketDimensions(
  marketId: string,
  options?: { minMarketCap?: number }
) {
  return marketRegistry.syncDimensions(marketId, options);
}

/**
 * 快捷方法：同步所有市场
 */
export async function syncAllMarkets() {
  return marketRegistry.syncAllDimensions();
}

/**
 * 快捷方法：获取所有已注册市场
 */
export function getRegisteredMarkets() {
  return marketRegistry.getAll().map((p) => ({
    id: p.id,
    name: p.name,
    suffix: p.symbolSuffix,
    currency: p.defaultCurrency,
  }));
}
