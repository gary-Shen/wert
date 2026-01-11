import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const MOCK_RATES: Record<string, string> = {
  CNY: "1",
  USD: "7.23", 
  HKD: "0.92",
  EUR: "7.85",
  JPY: "0.048",
};

export async function getExchangeRate(currencyCode: string): Promise<number> {
  if (currencyCode === "CNY") return 1;

  // 1. Try DB Cache
  const cached = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.currencyCode, currencyCode))
    .limit(1);

  if (cached.length > 0) {
    return parseFloat(cached[0].rateToCny); // Decimal returned as string
  }

  // 2. Fetch from API (Mocked)
  const rateStr = MOCK_RATES[currencyCode] || "1";
  const rate = parseFloat(rateStr);

  // 3. Update Cache
  // Note: OnConflict is different in Postgres vs SQLite.
  // Postgres: .onConflictDoUpdate({ target: [columns], set: ... })
  await db
    .insert(exchangeRates)
    .values({
      currencyCode,
      rateToCny: rateStr,
    })
    .onConflictDoUpdate({
      target: exchangeRates.currencyCode,
      set: { rateToCny: rateStr, lastUpdated: new Date() },
    });

  return rate;
}
