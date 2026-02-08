/**
 * Frankfurter API 汇率提供商
 * 免费开源的汇率 API，支持主要货币
 */

export interface FrankfurterRate {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * 从 Frankfurter API 获取最新汇率
 * @param base 基准货币代码 (如 "USD")
 * @param timeout 超时时间 (默认 10s)
 */
export async function fetchFrankfurterRates(
  base: string,
  timeout = 10000
): Promise<FrankfurterRate> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`Frankfurter fetch failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      base: data.base,
      rates: data.rates,
      timestamp: Date.now(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
