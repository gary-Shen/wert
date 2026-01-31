/**
 * 香港市场 Provider
 *
 * 数据源：
 * - 资产字典: 预定义列表（港交所无免费 API）
 * - 实时价格: Yahoo Finance
 *
 * Symbol 格式：
 * - 内部格式: 0700.HK, 9988.HK
 * - Yahoo 格式: 0700.HK (相同)
 */

import type {
  MarketProvider,
  AssetDimension,
  AssetPrice,
  MarketProviderConfig,
} from "../types";
import { createLogger } from "@/lib/logger";
import YahooFinance from "yahoo-finance2";

const log = createLogger("markets:hk");

/**
 * 港股预定义列表
 *
 * 注：港交所没有免费的官方 API，
 * 如需全量数据，可考虑：
 * 1. HKEX 付费数据服务
 * 2. 第三方数据商（如 Wind、Bloomberg）
 * 3. 爬虫（需遵守使用条款）
 */
const HK_STOCKS: Array<{
  symbol: string;
  name: string;
  cnName: string;
  sector?: string;
}> = [
  // 科技
  { symbol: "0700.HK", name: "Tencent Holdings", cnName: "腾讯控股", sector: "tech" },
  { symbol: "9988.HK", name: "Alibaba Group", cnName: "阿里巴巴-SW", sector: "tech" },
  { symbol: "9618.HK", name: "JD.com", cnName: "京东集团-SW", sector: "tech" },
  { symbol: "3690.HK", name: "Meituan", cnName: "美团-W", sector: "tech" },
  { symbol: "9999.HK", name: "NetEase", cnName: "网易-S", sector: "tech" },
  { symbol: "1810.HK", name: "Xiaomi Corp", cnName: "小米集团-W", sector: "tech" },
  { symbol: "9888.HK", name: "Baidu", cnName: "百度集团-SW", sector: "tech" },
  { symbol: "9961.HK", name: "Trip.com", cnName: "携程集团-S", sector: "tech" },
  { symbol: "1024.HK", name: "Kuaishou", cnName: "快手-W", sector: "tech" },
  // 金融
  { symbol: "0939.HK", name: "China Construction Bank", cnName: "建设银行", sector: "finance" },
  { symbol: "1398.HK", name: "ICBC", cnName: "工商银行", sector: "finance" },
  { symbol: "0005.HK", name: "HSBC Holdings", cnName: "汇丰控股", sector: "finance" },
  { symbol: "2318.HK", name: "Ping An Insurance", cnName: "中国平安", sector: "finance" },
  { symbol: "3988.HK", name: "Bank of China", cnName: "中国银行", sector: "finance" },
  { symbol: "0388.HK", name: "HKEX", cnName: "香港交易所", sector: "finance" },
  { symbol: "2628.HK", name: "China Life", cnName: "中国人寿", sector: "finance" },
  // 电信
  { symbol: "0941.HK", name: "China Mobile", cnName: "中国移动", sector: "telecom" },
  { symbol: "0728.HK", name: "China Telecom", cnName: "中国电信", sector: "telecom" },
  // 汽车
  { symbol: "9868.HK", name: "XPeng", cnName: "小鹏汽车-W", sector: "auto" },
  { symbol: "2015.HK", name: "Li Auto", cnName: "理想汽车-W", sector: "auto" },
  { symbol: "9866.HK", name: "NIO", cnName: "蔚来-SW", sector: "auto" },
  { symbol: "1211.HK", name: "BYD", cnName: "比亚迪", sector: "auto" },
  { symbol: "0175.HK", name: "Geely Auto", cnName: "吉利汽车", sector: "auto" },
  // 消费
  { symbol: "0027.HK", name: "Galaxy Entertainment", cnName: "银河娱乐", sector: "consumer" },
  { symbol: "1928.HK", name: "Sands China", cnName: "金沙中国", sector: "consumer" },
  { symbol: "0291.HK", name: "China Resources Beer", cnName: "华润啤酒", sector: "consumer" },
  // 地产
  { symbol: "1109.HK", name: "China Resources Land", cnName: "华润置地", sector: "real_estate" },
  { symbol: "0688.HK", name: "China Overseas Land", cnName: "中海外", sector: "real_estate" },
  // 能源
  { symbol: "0857.HK", name: "PetroChina", cnName: "中国石油", sector: "energy" },
  { symbol: "0386.HK", name: "Sinopec", cnName: "中石化", sector: "energy" },
  { symbol: "0883.HK", name: "CNOOC", cnName: "中海油", sector: "energy" },
];

const HK_ETFS: Array<{ symbol: string; name: string; cnName: string }> = [
  { symbol: "2800.HK", name: "Tracker Fund of HK", cnName: "盈富基金" },
  { symbol: "3067.HK", name: "iShares Hang Seng Tech", cnName: "安硕恒生科技" },
  { symbol: "2840.HK", name: "SPDR Gold Trust", cnName: "SPDR金ETF" },
  { symbol: "3033.HK", name: "CSOP Hang Seng Tech", cnName: "南方恒生科技" },
  { symbol: "2828.HK", name: "Hang Seng H-Share ETF", cnName: "恒生H股ETF" },
];

/**
 * 香港市场 Provider 实现
 */
export class HKMarketProvider implements MarketProvider {
  readonly id = "HK";
  readonly name = "香港市场";
  readonly defaultCurrency = "HKD";
  readonly symbolSuffix = ".HK";

  private yf = new YahooFinance();

  /**
   * 判断是否支持该 symbol
   */
  supports(symbol: string): boolean {
    // .HK 后缀
    if (symbol.toUpperCase().endsWith(".HK")) return true;

    // 4 位数字（港股代码）
    if (/^\d{4}$/.test(symbol)) return true;

    return false;
  }

  /**
   * 标准化 symbol
   */
  normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith(".HK")) return upper;

    // 4 位数字补 .HK
    if (/^\d{4}$/.test(symbol)) {
      return `${symbol.padStart(4, "0")}.HK`;
    }

    return `${upper}.HK`;
  }

  /**
   * 转换为 Yahoo Finance 格式
   */
  toSourceSymbol(symbol: string): string {
    // Yahoo 使用相同格式
    return symbol;
  }

  /**
   * 获取资产字典
   */
  async fetchDimensions(_config?: MarketProviderConfig): Promise<AssetDimension[]> {
    log.info("Fetching HK market dimensions from predefined list");

    const stocks: AssetDimension[] = HK_STOCKS.map((s) => ({
      symbol: s.symbol,
      assetType: "STOCK" as const,
      cnName: s.cnName,
      name: s.name,
      pinyinAbbr: s.symbol.replace(".HK", ""),
      sector: s.sector,
      currency: "HKD",
    }));

    const etfs: AssetDimension[] = HK_ETFS.map((e) => ({
      symbol: e.symbol,
      assetType: "ETF" as const,
      cnName: e.cnName,
      name: e.name,
      pinyinAbbr: e.symbol.replace(".HK", ""),
      currency: "HKD",
    }));

    const result = [...stocks, ...etfs];

    log.info("HK market dimensions fetched", {
      stocks: stocks.length,
      etfs: etfs.length,
      total: result.length,
    });

    return result;
  }

  /**
   * 获取单个资产价格
   */
  async fetchPrice(symbol: string): Promise<AssetPrice | null> {
    const sourceSymbol = this.toSourceSymbol(symbol);

    try {
      const quote = await Promise.race([
        this.yf.quote(sourceSymbol),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 10000)
        ),
      ]);

      if (!quote || !quote.regularMarketPrice) {
        return null;
      }

      return {
        symbol,
        price: quote.regularMarketPrice,
        currency: quote.currency || "HKD",
        priceDate: quote.regularMarketTime || new Date(),
        source: "YahooFinance",
      };
    } catch (error) {
      log.error("HK price fetch failed", { symbol, error: String(error) });
      return null;
    }
  }
}

/**
 * 单例导出
 */
export const hkMarketProvider = new HKMarketProvider();
