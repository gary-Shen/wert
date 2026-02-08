import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { randomUUID } from "expo-crypto";

// --- Enums 作为常量 ---
export const ASSET_CATEGORIES = [
  "CASH",
  "BANK_DEPOSIT",
  "STOCK",
  "FUND",
  "BOND",
  "REAL_ESTATE",
  "LIABILITY",
  "CRYPTO",
  "VEHICLE",
  "PRECIOUS_METAL",
  "COLLECTIBLE",
  "INSURANCE",
  "OTHER",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// --- 用户设置表 (单条记录) ---
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  baseCurrency: text("base_currency").default("CNY").notNull(),
  locale: text("locale").default("zh-CN").notNull(),
  region: text("region"), // "CN" | "OVERSEAS"
  setupComplete: integer("setup_complete", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// --- 资产账户表 ---
export const assetAccounts = sqliteTable("asset_accounts", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  category: text("category").$type<AssetCategory>().notNull(),
  currency: text("currency").notNull(), // ISO 货币代码
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  autoConfig: text("auto_config", { mode: "json" }), // JSON: { type: 'depreciation', ... }
  // 投资相关字段
  symbol: text("symbol"), // 股票/基金代码
  market: text("market"), // 交易市场 (US/HK/CN)
  quantity: real("quantity").default(0), // 持有数量
  costBasis: real("cost_basis"), // 成本价
  order: integer("sort_order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// --- 资产快照表 ---
export const snapshots = sqliteTable("snapshots", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  date: text("snap_date").notNull(), // YYYY-MM-DD 格式
  netWorth: real("total_net_worth").notNull(),
  totalAssets: real("total_assets").default(0),
  totalLiabilities: real("total_liabilities").default(0),
  currency: text("currency").default("CNY").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// --- 快照明细表 ---
export const snapshotItems = sqliteTable("snapshot_items", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => snapshots.id, { onDelete: "cascade" }),
  assetAccountId: text("asset_account_id")
    .notNull()
    .references(() => assetAccounts.id, { onDelete: "cascade" }),
  value: real("original_amount").notNull(), // 原币种金额
  quantity: real("quantity"),
  price: real("price"),
  exchangeRate: real("exchange_rate").notNull(), // 锁定汇率
  valueInBase: real("valuation").notNull(), // 折算后价值 (基准货币)
});

// --- 汇率缓存表 ---
export const exchangeRates = sqliteTable("exchange_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: real("rate").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// --- 资产价格表 ---
export const assetPrices = sqliteTable("asset_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // STOCK, FUND, CRYPTO
  price: real("price").notNull(),
  currency: text("currency").notNull(),
  priceDate: text("price_date").notNull(), // YYYY-MM-DD 格式
  source: text("source").notNull(), // Yahoo, EastMoney
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// --- 类型导出 ---
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

export type AssetAccount = typeof assetAccounts.$inferSelect;
export type NewAssetAccount = typeof assetAccounts.$inferInsert;

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;

export type SnapshotItem = typeof snapshotItems.$inferSelect;
export type NewSnapshotItem = typeof snapshotItems.$inferInsert;

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;

export type AssetPrice = typeof assetPrices.$inferSelect;
export type NewAssetPrice = typeof assetPrices.$inferInsert;
