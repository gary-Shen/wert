/**
 * 中国 A 股市场 Provider
 *
 * 数据源：
 * - 资产字典: Python Sidecar (AkShare)
 * - 实时价格: Python Sidecar
 *
 * Symbol 格式：
 * - 内部格式: 600519.CN (茅台), 000001.OF (基金)
 * - Sidecar 格式: sh600519, 000001
 */

import type {
  MarketProvider,
  AssetDimension,
  AssetPrice,
  MarketProviderConfig,
} from "../types";
import { createLogger } from "@/lib/logger";

const log = createLogger("markets:cn");

/**
 * 中国市场 Provider 实现
 */
export class CNMarketProvider implements MarketProvider {
  readonly id = "CN";
  readonly name = "中国A股";
  readonly defaultCurrency = "CNY";
  readonly symbolSuffix = ".CN";

  private sidecarUrl = process.env.DATA_SIDECAR_URL;
  private apiKey = process.env.INTERNAL_API_KEY;

  /**
   * 判断是否支持该 symbol
   */
  supports(symbol: string): boolean {
    const upper = symbol.toUpperCase();

    // A 股格式
    if (upper.endsWith(".CN")) return true;
    if (upper.endsWith(".SS") || upper.endsWith(".SZ")) return true;
    if (/^(SH|SZ)\d{6}$/i.test(symbol)) return true;

    // 基金格式
    if (upper.endsWith(".OF")) return true;
    if (/^\d{6}$/.test(symbol)) return true; // 6 位数字

    return false;
  }

  /**
   * 标准化 symbol
   */
  normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();

    // 已经是标准格式
    if (upper.endsWith(".CN") || upper.endsWith(".OF")) {
      return upper;
    }

    // .SS/.SZ 转 .CN
    if (upper.endsWith(".SS") || upper.endsWith(".SZ")) {
      return upper.replace(/\.(SS|SZ)$/, ".CN");
    }

    // sh/sz 前缀
    if (/^(SH|SZ)(\d{6})$/i.test(upper)) {
      const code = upper.slice(2);
      return `${code}.CN`;
    }

    // 6 位数字
    if (/^\d{6}$/.test(symbol)) {
      // 判断是股票还是基金
      // 基金通常以 0-5 开头
      const firstChar = symbol[0];
      if (["0", "1", "2", "3", "4", "5"].includes(firstChar)) {
        // 可能是基金，也可能是深圳股票
        // 这里假设默认是基金，实际应用中可能需要查询确认
        return `${symbol}.OF`;
      }
      // 6 开头是上海股票
      return `${symbol}.CN`;
    }

    return `${upper}.CN`;
  }

  /**
   * 转换为 Sidecar 格式
   */
  toSourceSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();

    // 基金
    if (upper.endsWith(".OF")) {
      return upper.replace(".OF", "");
    }

    // 股票
    if (upper.endsWith(".CN")) {
      const code = upper.replace(".CN", "");
      // 6 开头是上海，其他是深圳
      const prefix = code.startsWith("6") ? "sh" : "sz";
      return `${prefix}${code}`;
    }

    return symbol;
  }

  /**
   * 获取资产字典
   */
  async fetchDimensions(_config?: MarketProviderConfig): Promise<AssetDimension[]> {
    if (!this.sidecarUrl || !this.apiKey) {
      log.warn("Sidecar not configured, skipping CN market sync");
      return [];
    }

    log.info("Fetching CN market dimensions from Sidecar");

    const response = await fetch(`${this.sidecarUrl}/api/v1/dim`, {
      headers: { "X-API-Key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Sidecar API error: ${response.status}`);
    }

    const data: Array<{
      symbol: string;
      assetType: string;
      name: string;
      pinyin?: string;
      pinyinAbbr?: string;
    }> = await response.json();

    const result = data.map((item) => ({
      symbol: item.symbol,
      assetType: (item.assetType === "FUND" ? "FUND" : "STOCK") as AssetDimension["assetType"],
      cnName: item.name,
      name: item.name,
      pinyinAbbr: item.pinyinAbbr,
      currency: "CNY",
    }));

    log.info("CN market dimensions fetched", { count: result.length });

    return result;
  }

  /**
   * 获取单个资产价格
   */
  async fetchPrice(symbol: string): Promise<AssetPrice | null> {
    if (!this.sidecarUrl || !this.apiKey) {
      log.warn("Sidecar not configured");
      return null;
    }

    const sourceSymbol = this.toSourceSymbol(symbol);
    const upper = symbol.toUpperCase();

    try {
      // 判断是股票还是基金
      const isFund = upper.endsWith(".OF");
      const endpoint = isFund ? "/api/v1/fund/nav" : "/api/v1/stock/eod";
      const param = isFund ? "code" : "symbol";

      const url = new URL(`${this.sidecarUrl}${endpoint}`);
      url.searchParams.set(param, sourceSymbol);

      const response = await fetch(url.toString(), {
        headers: { "X-API-Key": this.apiKey },
      });

      if (!response.ok) {
        throw new Error(`Sidecar error: ${response.status}`);
      }

      const data = await response.json();

      return {
        symbol,
        price: data.price,
        currency: "CNY",
        priceDate: new Date(data.date),
        source: isFund ? "EastMoney" : "AkShare",
      };
    } catch (error) {
      log.error("CN price fetch failed", { symbol, error: String(error) });
      return null;
    }
  }
}

/**
 * 单例导出
 */
export const cnMarketProvider = new CNMarketProvider();
