import { BigNumber } from "bignumber.js";
import { type StandardRate } from "./types";
import { type RateProvider } from "./provider.base";
import { loggers } from "@/lib/logger";

const log = loggers.currency.aggregator;

export class FXAggregator {
  constructor(private providers: RateProvider[]) {}

  async getAggregatedRates(base: string = "USD") {
    // 1. 并发获取数据
    log.debug("Fetching rates from providers", { base, providerCount: this.providers.length });

    const results = await Promise.allSettled(this.providers.map(p => p.fetch(base)));

    // 记录失败的 provider
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        log.warn("Provider failed", { provider: this.providers[i].name, error: String(r.reason) });
      }
    });

    const validResults = results
      .filter((r): r is PromiseFulfilledResult<StandardRate> => r.status === "fulfilled")
      .map(r => r.value);

    if (validResults.length === 0) {
      log.error("All providers failed");
      throw new Error("All providers failed");
    }

    log.debug("Aggregation successful", { validProviders: validResults.map(v => v.provider) });

    // 2. 提取所有币种
    const allSymbols = [...new Set(validResults.flatMap(r => Object.keys(r.rates)))];
    const finalRates: Record<string, number> = {};

    // 3. 针对每个币种进行加权计算
    for (const symbol of allSymbols) {
      finalRates[symbol] = this.calculateWeightedRate(symbol, validResults);
    }

    return {
      base,
      timestamp: Date.now(),
      rates: finalRates,
      metadata: {
        sources_count: validResults.length,
        providers: validResults.map(v => v.provider)
      }
    };
  }

  async runUpdate(base: string = "USD") {
    try {
      const data = await this.getAggregatedRates(base);
      // TODO: Redis cache and pub/sub can be added here
      return data;
    } catch (error) {
      log.error("Aggregation task failed", { error: String(error) });
      throw error;
    }
  }

  private calculateWeightedRate(symbol: string, data: StandardRate[]): number {
    const dataPoints = data
      .filter(d => d.rates[symbol])
      .map(d => ({ price: d.rates[symbol], weight: d.weight }));

    if (dataPoints.length === 0) return 0;
    if (dataPoints.length === 1) return dataPoints[0].price;

    // A. 简单离群值过滤：剔除偏离中位数过大的数据（防止单源数据污染）
    const prices = dataPoints.map(p => p.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    
    // 过滤掉偏离中位数 5% 以上的数据
    const filteredPoints = dataPoints.filter(p => 
      Math.abs(p.price - median) / median < 0.05
    );

    const finalPoints = filteredPoints.length > 0 ? filteredPoints : dataPoints;

    // B. 加权平均计算（使用 BigNumber 保证精度）
    let totalWeight = new BigNumber(0);
    let weightedSum = new BigNumber(0);

    for (const p of finalPoints) {
      const w = new BigNumber(p.weight);
      totalWeight = totalWeight.plus(w);
      weightedSum = weightedSum.plus(w.times(p.price));
    }

    return weightedSum.div(totalWeight).toNumber();
  }
}