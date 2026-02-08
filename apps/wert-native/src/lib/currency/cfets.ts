/**
 * CFETS (中国外汇交易中心) 汇率提供商
 * 提供更准确的 CNY 相关汇率
 */

export interface CFETSRate {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * 从 CFETS 获取人民币中间价
 * 仅当涉及 CNY 时使用，提供更高精度
 * @param timeout 超时时间 (默认 15s，国内 API 较慢)
 */
export async function fetchCFETSRates(timeout = 15000): Promise<CFETSRate> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      "https://www.chinamoney.com.cn/r/cms/www/chinamoney/data/fx/ccpr.json",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`CFETS fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // CFETS 数据格式：records 数组，包含 USD/CNY 等货币对
    const rates: Record<string, number> = {};

    if (data.records && Array.isArray(data.records)) {
      for (const rec of data.records) {
        // USD/CNY = 7.1234 -> 存储为 CNY 基准: 1 CNY = 1/7.1234 USD
        if (rec.vName === "美元/人民币" || rec.vlabel === "USD/CNY") {
          const price = parseFloat(rec.price);
          if (!isNaN(price) && price > 0) {
            rates["USD"] = 1 / price;
          }
        }
      }
    }

    return {
      base: "CNY",
      rates,
      timestamp: Date.now(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
