/**
 * 新市场 Provider 模板
 *
 * 使用步骤：
 * 1. 复制此文件，重命名为 {market}.provider.ts
 * 2. 实现所有 MarketProvider 接口方法
 * 3. 在 index.ts 中注册
 *
 * 示例：添加日本市场
 * - 复制为 jp.provider.ts
 * - 修改 id: "JP", symbolSuffix: ".T"
 * - 实现数据获取逻辑
 */

import type {
  MarketProvider,
  AssetDimension,
  AssetPrice,
  MarketProviderConfig,
} from "../types";
import { createLogger } from "@/lib/logger";

const log = createLogger("markets:template");

/**
 * [市场名称] Provider 实现
 *
 * 数据源：
 * - 资产字典: [描述数据来源]
 * - 实时价格: [描述数据来源]
 *
 * Symbol 格式：
 * - 内部格式: [示例]
 * - 数据源格式: [示例]
 */
export class TemplateMarketProvider implements MarketProvider {
  /**
   * 市场唯一标识
   * 建议使用 ISO 国家代码：US, HK, CN, JP, UK, DE, FR, SG, AU...
   */
  readonly id = "TEMPLATE";

  /**
   * 市场显示名称（用于 UI 显示）
   */
  readonly name = "模板市场";

  /**
   * 默认币种（ISO 货币代码）
   */
  readonly defaultCurrency = "USD";

  /**
   * 内部 symbol 后缀
   * 用于标准化 symbol 格式，如 .US, .HK, .JP, .T
   */
  readonly symbolSuffix = ".TEMPLATE";

  /**
   * 判断是否支持该 symbol
   *
   * 实现要点：
   * 1. 先匹配带后缀的标准格式
   * 2. 再匹配该市场特有的格式
   * 3. 排除其他市场的格式
   *
   * @param symbol 原始 symbol
   * @returns 是否支持
   */
  supports(symbol: string): boolean {
    const upper = symbol.toUpperCase();

    // 1. 标准后缀
    if (upper.endsWith(this.symbolSuffix)) return true;

    // 2. 该市场特有格式（示例）
    // if (/^[0-9]{4}$/.test(symbol)) return true;

    // 3. 排除其他市场
    // if (/\.(US|HK|CN)$/i.test(symbol)) return false;

    return false;
  }

  /**
   * 标准化 symbol
   *
   * 将各种格式转换为统一的内部格式
   *
   * @param symbol 原始 symbol
   * @returns 标准化后的 symbol
   */
  normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();

    // 已是标准格式
    if (upper.endsWith(this.symbolSuffix)) return upper;

    // 添加后缀
    return `${upper}${this.symbolSuffix}`;
  }

  /**
   * 转换为数据源需要的格式
   *
   * @param symbol 标准化 symbol
   * @returns 数据源格式
   */
  toSourceSymbol(symbol: string): string {
    // 移除后缀或做其他转换
    return symbol.replace(this.symbolSuffix, "");
  }

  /**
   * 获取资产字典
   *
   * 实现选项：
   * 1. 官方 API（如 NASDAQ）
   * 2. 预定义列表（无 API 时）
   * 3. 第三方数据商
   * 4. 爬虫（需遵守条款）
   *
   * @param config 配置（如市值门槛）
   * @returns 资产列表
   */
  async fetchDimensions(config?: MarketProviderConfig): Promise<AssetDimension[]> {
    log.info("Fetching dimensions", { market: this.id, config });

    // TODO: 实现数据获取逻辑
    // 示例：从 API 获取
    // const response = await fetch('https://api.example.com/stocks');
    // const data = await response.json();
    // return data.map(item => ({
    //   symbol: this.normalizeSymbol(item.code),
    //   assetType: 'STOCK',
    //   cnName: item.name_cn || item.name,
    //   name: item.name,
    //   currency: this.defaultCurrency,
    // }));

    return [];
  }

  /**
   * 获取单个资产价格
   *
   * @param symbol 标准化 symbol
   * @returns 价格数据
   */
  async fetchPrice(symbol: string): Promise<AssetPrice | null> {
    const sourceSymbol = this.toSourceSymbol(symbol);

    log.debug("Fetching price", { symbol, sourceSymbol });

    try {
      // TODO: 实现价格获取逻辑
      // 示例：使用 Yahoo Finance
      // const yf = new YahooFinance();
      // const quote = await yf.quote(sourceSymbol);
      // return {
      //   symbol,
      //   price: quote.regularMarketPrice,
      //   currency: quote.currency || this.defaultCurrency,
      //   priceDate: quote.regularMarketTime || new Date(),
      //   source: 'YahooFinance',
      // };

      return null;
    } catch (error) {
      log.error("Price fetch failed", { symbol, error: String(error) });
      return null;
    }
  }

  /**
   * 批量获取价格（可选优化）
   *
   * 如果数据源支持批量查询，实现此方法可提高性能
   */
  async fetchPrices?(symbols: string[]): Promise<Map<string, AssetPrice>> {
    const results = new Map<string, AssetPrice>();

    // TODO: 实现批量获取逻辑
    // 如果数据源不支持批量，可以使用并发控制
    // const pLimit = (await import('p-limit')).default;
    // const limit = pLimit(10);
    // await Promise.all(symbols.map(s => limit(() => this.fetchPrice(s))));

    return results;
  }
}

/**
 * 单例导出
 */
export const templateMarketProvider = new TemplateMarketProvider();

/*
 * 注册示例（在 index.ts 中添加）：
 *
 * import { templateMarketProvider } from "./providers/_template.provider";
 *
 * registerMarket(templateMarketProvider, {
 *   enabled: true,
 *   minMarketCap: 1_000_000_000,
 * });
 */
