import { RateProvider } from "./provider.base";
import { StandardRateSchema, type StandardRate } from "./types";

export class FrankfurterProvider extends RateProvider {
  name = "Frankfurter";
  weight = 5;

  async fetch(base: string): Promise<StandardRate> {
    const response = await this.fetchWithTimeout(
      `https://api.frankfurter.dev/v1/latest?base=${base}`,
      {},
      10000 // 10s timeout
    );

    if (!response.ok) {
      throw new Error(`Frankfurter fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return StandardRateSchema.parse({
      base: data.base,
      rates: data.rates,
      timestamp: Date.now(),
      provider: this.name,
      weight: this.weight,
    });
  }
}