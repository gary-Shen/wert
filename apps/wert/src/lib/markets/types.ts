/**
 * 金融市场抽象层 - 类型定义
 *
 * 设计目标：
 * 1. 统一接口 - 所有市场实现相同的 Provider 接口
 * 2. 可插拔 - 新增市场只需实现接口并注册
 * 3. 自描述 - 每个 Provider 声明自己支持的 symbol 格式
 */

/**
 * 资产元数据（字典数据）
 */
export interface AssetDimension {
  /** 标准化 symbol，如 AAPL.US, 0700.HK, 600519.CN */
  symbol: string;
  /** 资产类型 */
  assetType: "STOCK" | "ETF" | "FUND" | "INDEX" | "BOND" | "CRYPTO";
  /** 中文名称 */
  cnName: string;
  /** 英文名称 */
  name?: string;
  /** 搜索用拼音缩写 */
  pinyinAbbr?: string;
  /** 市值（美元） */
  marketCap?: number;
  /** 板块 */
  sector?: string;
  /** 币种 */
  currency: string;
}

/**
 * 资产价格
 */
export interface AssetPrice {
  symbol: string;
  price: number;
  currency: string;
  priceDate: Date;
  source: string;
}

/**
 * 市场 Provider 配置
 */
export interface MarketProviderConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 同步时的市值门槛（仅对股票有效） */
  minMarketCap?: number;
  /** 同步时的并发数 */
  concurrency?: number;
  /** API 超时时间（毫秒） */
  timeout?: number;
  /** 自定义配置 */
  [key: string]: unknown;
}

/**
 * 同步结果
 */
export interface SyncResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped?: number;
  /** 耗时（毫秒） */
  duration?: number;
}

/**
 * 市场 Provider 接口
 *
 * 每个金融市场实现此接口：
 * - US Market (NASDAQ/NYSE)
 * - HK Market (HKEX)
 * - CN Market (上交所/深交所)
 * - JP Market (东京证券交易所)
 * - EU Market (欧洲各交易所)
 * - Crypto Market (加密货币)
 */
export interface MarketProvider {
  /**
   * 市场唯一标识
   * 如: "US", "HK", "CN", "JP", "EU", "CRYPTO"
   */
  readonly id: string;

  /**
   * 市场显示名称
   */
  readonly name: string;

  /**
   * 默认币种
   */
  readonly defaultCurrency: string;

  /**
   * Symbol 后缀
   * 如: ".US", ".HK", ".CN"
   */
  readonly symbolSuffix: string;

  /**
   * 判断是否支持该 symbol
   * @param symbol 原始 symbol（可能带或不带后缀）
   * @returns 是否支持
   */
  supports(symbol: string): boolean;

  /**
   * 标准化 symbol（统一格式）
   * @param symbol 原始 symbol
   * @returns 标准化后的 symbol（如 AAPL -> AAPL.US）
   */
  normalizeSymbol(symbol: string): string;

  /**
   * 获取数据源需要的 symbol 格式
   * @param symbol 标准化 symbol
   * @returns 数据源格式（如 AAPL.US -> AAPL for Yahoo）
   */
  toSourceSymbol(symbol: string): string;

  /**
   * 获取资产字典（全量）
   * @param config 配置
   * @returns 资产列表
   */
  fetchDimensions(config?: MarketProviderConfig): Promise<AssetDimension[]>;

  /**
   * 获取单个资产价格
   * @param symbol 标准化 symbol
   * @returns 价格数据
   */
  fetchPrice(symbol: string): Promise<AssetPrice | null>;

  /**
   * 批量获取价格（可选实现，默认逐个调用 fetchPrice）
   * @param symbols symbol 列表
   * @returns 价格列表
   */
  fetchPrices?(symbols: string[]): Promise<Map<string, AssetPrice>>;
}

/**
 * 市场注册表类型
 */
export type MarketRegistry = Map<string, MarketProvider>;
