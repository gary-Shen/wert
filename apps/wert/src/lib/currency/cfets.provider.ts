import { RateProvider } from "./provider.base";
import { StandardRateSchema, type StandardRate } from "./types";

export class CFETSProvider extends RateProvider {
  name = "CFETS";
  weight = 10; // 针对人民币业务赋予最高权重

  async fetch(): Promise<StandardRate> {
    const url = "https://www.chinamoney.com.cn/r/cms/www/chinamoney/data/fx/ccpr.json";

    const response = await this.fetchWithTimeout(
      url,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" } },
      15000 // 15s timeout (国内 API 可能较慢)
    );

    if (!response.ok) {
      throw new Error(`CFETS fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // 逻辑转换：CFETS 的数据通常以 CNY 为基准的中间价
    const rates: Record<string, number> = {};
    if (data.records && Array.isArray(data.records)) {
      data.records.forEach((rec: any) => {
        // 例如：USD/CNY = 7.1234
        if (rec.vlabel === "USD/CNY") rates["USD"] = 1 / parseFloat(rec.price);
      });
    }

    return StandardRateSchema.parse({
      base: "CNY",
      rates,
      timestamp: Date.now(),
      provider: this.name,
      weight: this.weight,
    });
  }
}