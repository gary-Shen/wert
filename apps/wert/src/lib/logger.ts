import createDebug from 'debug';

const APP_NAME = 'wert';

/**
 * 创建带命名空间的 debug logger
 *
 * 命名空间规范：wert:<module>:<submodule>
 * 例如：wert:cron:sync-assets, wert:currency:aggregator
 *
 * 使用方式：
 * ```ts
 * import { createLogger } from '@/lib/logger';
 * const log = createLogger('currency:aggregator');
 * log.info('Starting aggregation');
 * log.error('Failed', { error: err.message });
 * ```
 *
 * 启用日志：
 * - 开发环境: DEBUG=wert:* bun dev
 * - 生产环境: DEBUG=wert:* node server.js
 * - 仅特定模块: DEBUG=wert:cron:*,wert:currency:* bun dev
 */
export function createLogger(namespace: string) {
  const debug = createDebug(`${APP_NAME}:${namespace}`);

  // 生产环境强制启用（通过检测 VERCEL 或 NODE_ENV）
  // debug 模块默认在 browser 和 tty 环境工作
  // 在 serverless 环境需要手动 enable
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    createDebug.enable(process.env.DEBUG || `${APP_NAME}:*`);
  }

  return {
    /**
     * 普通信息日志
     */
    info: (message: string, data?: Record<string, unknown>) => {
      debug(formatLog('info', message, data));
    },

    /**
     * 警告日志
     */
    warn: (message: string, data?: Record<string, unknown>) => {
      debug(formatLog('warn', message, data));
    },

    /**
     * 错误日志 (同时输出到 stderr)
     */
    error: (message: string, data?: Record<string, unknown>) => {
      const formatted = formatLog('error', message, data);
      debug(formatted);
      // 错误日志同时输出到 stderr，确保生产环境可见
      if (process.env.NODE_ENV === 'production') {
        console.error(formatted);
      }
    },

    /**
     * 调试日志 (仅开发环境)
     */
    debug: (message: string, data?: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== 'production') {
        debug(formatLog('debug', message, data));
      }
    },

    /**
     * 原始 debug 实例，用于高级用法
     */
    raw: debug,
  };
}

/**
 * 格式化日志输出
 * 生产环境输出 JSON，开发环境输出可读格式
 */
function formatLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'production') {
    // 生产环境：JSON 格式，便于日志聚合工具解析
    return JSON.stringify({
      level,
      message,
      timestamp,
      ...data,
    });
  }

  // 开发环境：可读格式
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${level.toUpperCase()}] ${message}${dataStr}`;
}

// 预定义的 logger 实例，按模块划分
export const loggers = {
  cron: {
    syncAssets: createLogger('cron:sync-assets'),
    syncRates: createLogger('cron:sync-rates'),
    syncPrices: createLogger('cron:sync-prices'),
  },
  currency: {
    index: createLogger('currency'),
    aggregator: createLogger('currency:aggregator'),
    frankfurter: createLogger('currency:frankfurter'),
    cfets: createLogger('currency:cfets'),
  },
  price: createLogger('price'),
  sync: createLogger('sync'),
  db: createLogger('db'),
};

export type Logger = ReturnType<typeof createLogger>;
