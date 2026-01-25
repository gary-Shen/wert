import {
  boolean,
  timestamp,
  pgTable,
  text,
  uuid,
  jsonb,
  decimal,
  date,
  pgEnum,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- Enums ---
export const assetCategoryEnum = pgEnum("asset_category", ["CASH", "STOCK", "FUND", "BOND", "REAL_ESTATE", "LIABILITY", "CRYPTO", "VEHICLE", "PRECIOUS_METAL", "COLLECTIBLE"]);

// --- Auth Core (BetterAuth) ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  // Custom Fields
  password: text("password"),
  baseCurrency: text("baseCurrency").default("CNY"),
  // User Settings
  setupComplete: boolean("setupComplete").default(false).notNull(),
  locale: text("locale").default("zh-CN"),
  region: text("region"), // "CN" | "OVERSEAS"
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true, mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true, mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
});

// --- App Business Logic ---

// --- App Business Logic ---

/**
 * 资产账户表
 * 存储用户的所有资产项配置
 */
export const assetAccounts = pgTable("asset_account", {
  /** 资产ID */
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 关联用户ID */
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** 资产名称 */
  name: text("name").notNull(),
  /** 资产类别 (现金/股票/房产等) */
  category: assetCategoryEnum("category").notNull(),
  /** 币种 (ISO 代码) */
  currency: text("currency").notNull(), // e.g. "USD"
  /** 是否已归档 (软删除) */
  isArchived: boolean("isArchived").default(false).notNull(),
  /** 自动化配置 (折旧算法/贷款计划等) */
  autoConfig: jsonb("autoConfig"), // { tyoe: 'depreciation', ... }
  // Investment Details
  /** 股票/基金代码 (如 AAPL.US) */
  symbol: text("symbol"),
  /** 交易市场 (US/HK/CN) */
  market: text("market"),
  /** 持有数量/份额 */
  quantity: decimal("quantity", { precision: 19, scale: 6 }).default("0"),
  /** 持仓成本/成本价 */
  costBasis: decimal("costBasis", { precision: 19, scale: 4 }),
  /** 创建时间 */
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow(),
});

/**
 * 资产快照表
 * 记录每次“盘点”的总览数据
 */
export const snapshots = pgTable("snapshot", {
  /** 快照ID */
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 关联用户ID */
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** 快照日期 (YYYY-MM-DD) */
  snapDate: date("snapDate").notNull(),
  // Redundant Totals (Stored as Decimal/Numeric string)
  /** 总净值 (基准货币) */
  totalNetWorth: decimal("totalNetWorth", { precision: 19, scale: 4 }).notNull(),
  /** 总资产 (基准货币) */
  totalAssets: decimal("totalAssets", { precision: 19, scale: 4 }).default("0"),
  /** 总负债 (基准货币) */
  totalLiabilities: decimal("totalLiabilities", { precision: 19, scale: 4 }).default("0"),
  /** 备注/复盘笔记 */
  note: text("note"),
  /** 创建时间 */
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow(),
});

/**
 * 快照明细表
 * 记录每次盘点时，单个资产的具体价值
 */
export const snapshotItems = pgTable("snapshot_item", {
  /** 明细ID */
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 关联快照ID */
  snapshotId: uuid("snapshotId")
    .notNull()
    .references(() => snapshots.id, { onDelete: "cascade" }),
  /** 关联资产ID */
  assetAccountId: uuid("assetAccountId")
    .notNull()
    .references(() => assetAccounts.id, { onDelete: "cascade" }),
  /** 原始金额/价值 (原币种) */
  originalAmount: decimal("originalAmount", { precision: 19, scale: 4 }).notNull(),
  /** 当时的汇率 (原币种->基准货币) */
  exchangeRate: decimal("exchangeRate", { precision: 19, scale: 4 }).notNull(), // Locked rate
  /** 折算价值 (基准货币) */
  valuation: decimal("valuation", { precision: 19, scale: 4 }).notNull(), // CNY Value
});

/**
 * 汇率缓存表
 * 存储任意货币对的汇率 (generic support)
 */
export const exchangeRates = pgTable(
  "exchange_rate",
  {
    /** 源货币 (e.g. USD) */
    fromCurrency: text("fromCurrency").notNull(),
    /** 目标货币 (e.g. CNY) */
    toCurrency: text("toCurrency").notNull(),
    /** 汇率 (1 from = ? to) */
    rate: decimal("rate", { precision: 19, scale: 6 }).notNull(),
    /** 最后更新时间 */
    lastUpdated: timestamp("lastUpdated", { withTimezone: true, mode: "date" }).defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.fromCurrency, table.toCurrency] }),
    };
  }
);

/**
 * 资产价格表
 * 存储各资产(股票/基金/加密货币)的价格
 */
export const assetPrices = pgTable("asset_price", {
  /** ID */
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 唯一标识，如 "AAPL.US", "000001.OF" */
  symbol: text("symbol").notNull(),
  /** 资产类型 (STOCK, FUND, CRYPTO) */
  assetType: text("assetType").notNull(),
  /** 原始价格 */
  price: decimal("price", { precision: 19, scale: 4 }).notNull(),
  /** 原始币种 (USD, CNY, HKD) */
  currency: text("currency").notNull(),
  /** 价格所属日期（处理 T+1 关键） */
  priceDate: date("priceDate").notNull(),
  /** 来源 (Yahoo, EastMoney) */
  source: text("source").notNull(),
  /** 更新时间 */
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow(),
}, (t) => ({
  unq: unique().on(t.symbol, t.priceDate),
}));

export const assetDimensions = pgTable("asset_dimension", {
  /** ID */
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** 唯一标识，如 "AAPL.US", "000001.OF" */
  symbol: text("symbol").notNull().unique(),
  /** 资产类型 (STOCK, FUND, CRYPTO) */
  assetType: text("assetType").notNull(),
  /** 中文简称 */
  cnName: text("cnName").notNull(),
  /** 官方英文简称 */
  name: text("name"),
  /** 别名 */
  alias: text("alias"),
  /** 全拼 */
  pinyin: text("pinyin"),
  /** 拼音首字母 */
  pinyinAbbr: text("pinyinAbbr"),
  /** 是否在售 */
  isActive: boolean("isActive").default(true).notNull(),
}, (t) => ({
  // Trigram index for search
  searchIdx: index("idx_asset_search").using("gin", sql`${t.cnName} gin_trgm_ops, ${t.symbol} gin_trgm_ops, ${t.pinyinAbbr} gin_trgm_ops`)
}));