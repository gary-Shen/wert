/**
 * 美国市场 Provider
 *
 * 数据源：
 * - 资产字典: Finnhub API (商业授权明确)
 * - 实时价格: Yahoo Finance
 *
 * Finnhub 优势：
 * - 免费层 60 次/分钟，足够同步资产字典
 * - Symbol 列表 API 免费
 * - 商业授权明确，可用于商业项目
 *
 * Symbol 格式：
 * - 内部格式: AAPL.US, SPY.US
 * - Finnhub 格式: AAPL, SPY
 * - Yahoo 格式: AAPL, SPY
 */

import type {
  MarketProvider,
  AssetDimension,
  AssetPrice,
  MarketProviderConfig,
} from "../types";
import { createLogger } from "@/lib/logger";
import YahooFinance from "yahoo-finance2";

const log = createLogger("markets:us");

// Finnhub API 响应类型
interface FinnhubSymbol {
  symbol: string;
  description: string;
  type: string;         // "Common Stock", "ETP", "ADR" 等
  currency: string;
  figi?: string;
  mic?: string;
}

// 常见股票中文名称映射
const CN_NAME_MAP: Record<string, string> = {
  // 科技巨头
  AAPL: "苹果",
  MSFT: "微软",
  GOOGL: "谷歌",
  GOOG: "谷歌",
  AMZN: "亚马逊",
  NVDA: "英伟达",
  META: "Meta",
  TSLA: "特斯拉",
  AMD: "AMD",
  INTC: "英特尔",
  NFLX: "奈飞",
  AVGO: "博通",
  CSCO: "思科",
  ORCL: "甲骨文",
  ADBE: "Adobe",
  CRM: "Salesforce",
  // 金融
  JPM: "摩根大通",
  BAC: "美国银行",
  WFC: "富国银行",
  GS: "高盛",
  MS: "摩根士丹利",
  C: "花旗",
  V: "Visa",
  MA: "万事达",
  AXP: "美国运通",
  "BRK-A": "伯克希尔A",
  "BRK-B": "伯克希尔B",
  // 消费
  WMT: "沃尔玛",
  COST: "Costco",
  HD: "家得宝",
  NKE: "耐克",
  MCD: "麦当劳",
  SBUX: "星巴克",
  KO: "可口可乐",
  PEP: "百事可乐",
  PG: "宝洁",
  // 医疗
  JNJ: "强生",
  UNH: "联合健康",
  PFE: "辉瑞",
  MRK: "默沙东",
  ABBV: "艾伯维",
  LLY: "礼来",
  // 能源
  XOM: "埃克森美孚",
  CVX: "雪佛龙",
  // 其他
  DIS: "迪士尼",
  T: "AT&T",
  VZ: "威瑞森",
  // 中概股
  BABA: "阿里巴巴",
  JD: "京东",
  PDD: "拼多多",
  BIDU: "百度",
  NIO: "蔚来",
  XPEV: "小鹏汽车",
  LI: "理想汽车",
  NTES: "网易",
  TME: "腾讯音乐",
  BILI: "哔哩哔哩",
  // ETF
  SPY: "标普500ETF",
  QQQ: "纳指100ETF",
  VOO: "Vanguard标普500",
  VTI: "Vanguard全市场",
  IVV: "iShares标普500",
  IWM: "罗素2000ETF",
  DIA: "道琼斯ETF",
  GLD: "黄金ETF",
  TLT: "20年+国债ETF",
  BND: "Vanguard全债券",
  AGG: "iShares美债",
  VEA: "发达市场ETF",
  VWO: "新兴市场ETF",
  EEM: "iShares新兴市场",
  FXI: "中国大盘ETF",
  KWEB: "中国互联网ETF",
  XLK: "科技板块ETF",
  XLF: "金融板块ETF",
  XLE: "能源板块ETF",
  XLV: "医疗板块ETF",
  ARKK: "ARK创新ETF",
  SOXX: "半导体ETF",
  SMH: "VanEck半导体",
};

/**
 * 美国市场 Provider 实现
 */
export class USMarketProvider implements MarketProvider {
  readonly id = "US";
  readonly name = "美国市场";
  readonly defaultCurrency = "USD";
  readonly symbolSuffix = ".US";

  private yf = new YahooFinance();
  private finnhubApiKey = process.env.FINNHUB_API_KEY;

  /**
   * 判断是否支持该 symbol
   */
  supports(symbol: string): boolean {
    // 已有 .US 后缀
    if (symbol.endsWith(".US")) return true;

    // 排除其他市场
    if (/\.(HK|CN|SS|SZ|OF|TW|L|DE|PA|TO|T)$/i.test(symbol)) return false;

    // 排除 A 股格式
    if (/^(sh|sz)\d{6}$/i.test(symbol)) return false;
    if (/^\d{6}$/.test(symbol)) return false;

    // 有效的美股 symbol
    return /^[A-Z]{1,5}(-[A-Z])?$/i.test(symbol);
  }

  normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith(".US")) return upper;
    return `${upper}.US`;
  }

  toSourceSymbol(symbol: string): string {
    return symbol.replace(".US", "");
  }

  /**
   * 获取资产字典
   *
   * 数据源优先级：
   * 1. Finnhub API（有 API Key 时）
   * 2. 降级到 NASDAQ API（无 Key 时，可能有法律风险）
   */
  async fetchDimensions(config?: MarketProviderConfig): Promise<AssetDimension[]> {
    if (this.finnhubApiKey) {
      return this.fetchFromFinnhub(config);
    }

    log.warn("FINNHUB_API_KEY not set, falling back to NASDAQ API (may have legal risks)");
    return this.fetchFromNasdaq(config);
  }

  /**
   * 从 Finnhub 获取数据（推荐）
   */
  private async fetchFromFinnhub(config?: MarketProviderConfig): Promise<AssetDimension[]> {
    log.info("Fetching US market dimensions from Finnhub API");

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${this.finnhubApiKey}`,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const symbols: FinnhubSymbol[] = await response.json();

    log.info("Fetched symbols from Finnhub", { count: symbols.length });

    // 转换并筛选
    const result: AssetDimension[] = [];

    for (const item of symbols) {
      // 跳过无效 symbol
      if (!this.isValidSymbol(item.symbol)) continue;

      // 确定资产类型
      const assetType = this.mapFinnhubType(item.type);

      result.push({
        symbol: `${item.symbol}.US`,
        assetType,
        cnName: CN_NAME_MAP[item.symbol] || item.description,
        name: item.description,
        pinyinAbbr: item.symbol,
        currency: item.currency || "USD",
      });
    }

    log.info("US market dimensions processed", {
      total: symbols.length,
      valid: result.length,
    });

    return result;
  }

  /**
   * 从 NASDAQ API 获取数据（降级方案）
   */
  private async fetchFromNasdaq(config?: MarketProviderConfig): Promise<AssetDimension[]> {
    log.info("Fetching US market dimensions from NASDAQ API");

    const [stocksRes, etfsRes] = await Promise.all([
      fetch(
        "https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true",
        { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
      ),
      fetch(
        "https://api.nasdaq.com/api/screener/etf?tableonly=true&limit=10000&download=true",
        { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
      ),
    ]);

    if (!stocksRes.ok || !etfsRes.ok) {
      throw new Error("NASDAQ API error");
    }

    const stocksData = await stocksRes.json();
    const etfsData = await etfsRes.json();

    const stocks = stocksData.data?.rows || [];
    const etfs = etfsData.data?.data?.rows || [];

    const symbolSet = new Set<string>();
    const result: AssetDimension[] = [];

    // ETF 优先
    for (const etf of etfs) {
      if (!this.isValidSymbol(etf.symbol)) continue;
      if (symbolSet.has(etf.symbol)) continue;

      symbolSet.add(etf.symbol);
      result.push({
        symbol: `${etf.symbol}.US`,
        assetType: "ETF",
        cnName: CN_NAME_MAP[etf.symbol] || etf.companyName,
        name: etf.companyName,
        pinyinAbbr: etf.symbol,
        currency: "USD",
      });
    }

    // 股票
    for (const stock of stocks) {
      if (!this.isValidSymbol(stock.symbol)) continue;
      if (symbolSet.has(stock.symbol)) continue;

      symbolSet.add(stock.symbol);
      result.push({
        symbol: `${stock.symbol}.US`,
        assetType: "STOCK",
        cnName: CN_NAME_MAP[stock.symbol] || stock.name,
        name: stock.name,
        pinyinAbbr: stock.symbol,
        marketCap: stock.marketCap ? parseFloat(stock.marketCap) : undefined,
        currency: "USD",
      });
    }

    log.info("US market dimensions from NASDAQ", {
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
        currency: quote.currency || "USD",
        priceDate: quote.regularMarketTime || new Date(),
        source: "YahooFinance",
      };
    } catch (error) {
      log.error("US price fetch failed", { symbol, error: String(error) });
      return null;
    }
  }

  /**
   * 映射 Finnhub 类型到内部类型
   */
  private mapFinnhubType(finnhubType: string): AssetDimension["assetType"] {
    const typeMap: Record<string, AssetDimension["assetType"]> = {
      "Common Stock": "STOCK",
      "ETP": "ETF",           // Exchange Traded Product
      "ETF": "ETF",
      "ADR": "STOCK",         // American Depositary Receipt
      "REIT": "STOCK",        // Real Estate Investment Trust
      "Closed-End Fund": "FUND",
      "Unit": "STOCK",
    };

    return typeMap[finnhubType] || "STOCK";
  }

  /**
   * 验证 symbol 有效性
   */
  private isValidSymbol(symbol: string): boolean {
    if (!symbol) return false;
    // 排除特殊字符（除了连字符）
    if (/[.^+=]/.test(symbol)) return false;
    // 排除过长代码
    if (symbol.length > 5 && !symbol.includes("-")) return false;
    // 排除纯数字
    if (/^\d+$/.test(symbol)) return false;
    return true;
  }
}

export const usMarketProvider = new USMarketProvider();
