import { drizzle } from "drizzle-orm/op-sqlite";
import { open } from "@op-engineering/op-sqlite";

import * as schema from "./schema";
import { runMigrations } from "./migrations";

// 打开数据库连接
const opsqlite = open({
  name: "assetsnap.db",
});

// 创建 Drizzle 实例
export const db = drizzle(opsqlite, { schema });

/**
 * 初始化数据库：运行建表迁移
 * 在应用启动时调用一次
 */
export async function initDatabase() {
  runMigrations(opsqlite);
}

// 导出 schema
export * from "./schema";
