// 定义 SQLite 连接类型（兼容 op-sqlite）
interface SQLiteConnection {
  execute: (sql: string) => void;
}

/**
 * v1 数据库建表迁移
 * 使用 CREATE TABLE IF NOT EXISTS，安全可重复执行
 */
export function runMigrations(db: SQLiteConnection) {
  // 开启 WAL 模式提升性能
  db.execute("PRAGMA journal_mode = WAL;");

  // 设置表
  db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_currency TEXT NOT NULL DEFAULT 'CNY',
      locale TEXT NOT NULL DEFAULT 'zh-CN',
      region TEXT,
      setup_complete INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // 资产账户表
  db.execute(`
    CREATE TABLE IF NOT EXISTS asset_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      currency TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      auto_config TEXT,
      symbol TEXT,
      market TEXT,
      quantity REAL DEFAULT 0,
      cost_basis REAL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // 快照表
  db.execute(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      snap_date TEXT NOT NULL,
      total_net_worth REAL NOT NULL,
      total_assets REAL DEFAULT 0,
      total_liabilities REAL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CNY',
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // 快照明细表
  db.execute(`
    CREATE TABLE IF NOT EXISTS snapshot_items (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      asset_account_id TEXT NOT NULL REFERENCES asset_accounts(id) ON DELETE CASCADE,
      original_amount REAL NOT NULL,
      quantity REAL,
      price REAL,
      exchange_rate REAL NOT NULL,
      valuation REAL NOT NULL
    );
  `);

  // 汇率缓存表
  db.execute(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      last_updated INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // 资产价格表
  db.execute(`
    CREATE TABLE IF NOT EXISTS asset_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      price_date TEXT NOT NULL,
      source TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  // 开启外键约束
  db.execute("PRAGMA foreign_keys = ON;");
}
