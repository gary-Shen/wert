'use server'

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { assetAccounts, snapshots, snapshotItems, user } from "@/db/schema";
import { fetchPrice } from "@/lib/services/price";
import { calculateDepreciation, calculateSimpleLoanAmortization } from "@/lib/logic/calculator";
import { getExchangeRate } from "@/lib/currency";
import { desc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { BigNumber } from "bignumber.js";

// Derived Types
export type AssetAccount = typeof assetAccounts.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
export type NewSnapshotItem = typeof snapshotItems.$inferInsert;

export type AssetSnapshotDraft = {
  assetId: string; // UUID
  name: string;
  type: AssetAccount['category']; // Use strict category type
  currency: string;
  previousValue: number | null;
  calculatedValue: number;
  currentValue: number;
  isDirty: boolean;
  exchangeRate: number; // For UI preview
  quantity?: number;
  price?: number;
  symbol?: string;
  market?: string;
};

export async function prepareSnapshotDraft(): Promise<AssetSnapshotDraft[]> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  // Fetch User Settings
  const [userData] = await db.select({ baseCurrency: user.baseCurrency }).from(user).where(eq(user.id, userId));
  const targetCurrency = userData?.baseCurrency || "CNY";

  // 1. Fetch Active Assets
  const activeAssets = await db.select().from(assetAccounts).where(
    and(eq(assetAccounts.userId, userId), eq(assetAccounts.isArchived, false))
  );

  // 2. Fetch Last Snapshot
  const lastSnapshotList = await db.select().from(snapshots)
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.snapDate), desc(snapshots.createdAt))
    .limit(1);
  const lastSnapshot = lastSnapshotList[0];

  const previousRecordsMap = new Map<string, number>();
  if (lastSnapshot) {
    const items = await db.select().from(snapshotItems).where(eq(snapshotItems.snapshotId, lastSnapshot.id));
    items.forEach(r => previousRecordsMap.set(r.assetAccountId, parseFloat(r.originalAmount)));
  }

  const drafts = await Promise.all(activeAssets.map(async (asset) => {
    const prevVal = previousRecordsMap.get(asset.id) ?? 0;
    let calculated = prevVal;
    let unitPrice = 0;
    const quantity = asset.quantity ? parseFloat(asset.quantity) : 0;

    // A. Priority: Real-time Price (Stocks/Funds)
    if (asset.symbol && quantity) {
      // Construct symbol: Ticker + Market (e.g., AAPL.US, 700.HK)
      let symbolStr = asset.symbol;
      if (asset.market && !symbolStr.includes('.')) {
        symbolStr = `${symbolStr}.${asset.market}`;
      }

      const price = await fetchPrice(symbolStr);
      if (price !== null) {
        unitPrice = price;
        calculated = price * quantity;
      }
    }
    // B. Fallback: Automation Config (Depreciation/Loans)
    else if (asset.autoConfig) {
      // Type assertion for autoConfig structure
      const meta = asset.autoConfig as {
        purchasePrice?: number;
        purchaseDate?: string;
        lifespanMonths?: number;
        monthlyPayment?: number;
        initialLoan?: number;
        repaymentDate?: number | string;
        paymentDay?: number;
      };

      if (asset.category === "REAL_ESTATE" && meta.purchasePrice && meta.purchaseDate) {
        calculated = calculateDepreciation(
          meta.purchasePrice,
          meta.purchaseDate,
          meta.lifespanMonths || 120
        );
      } else if (asset.category === "LIABILITY" && meta.monthlyPayment) {
        // repaymentDate should be the start date of the loan for amortization
        const startDate = meta.repaymentDate ? new Date(meta.repaymentDate) : new Date();
        calculated = calculateSimpleLoanAmortization(
          meta.initialLoan || prevVal,
          meta.monthlyPayment,
          startDate
        );
      }
    }

    // Convert to User's Base Currency
    const rate = await getExchangeRate(asset.currency, targetCurrency);

    return {
      assetId: asset.id,
      name: asset.name,
      type: asset.category,
      currency: asset.currency,
      previousValue: prevVal,
      calculatedValue: calculated,
      currentValue: calculated,
      isDirty: false,
      exchangeRate: rate.toNumber(), // UI Display
      quantity,
      price: unitPrice,
      symbol: asset.symbol || undefined,
      market: asset.market || undefined,
    };
  }));

  return drafts;
}

export async function commitSnapshot(
  dateStr: string,
  records: { assetId: string; value: number; quantity?: number }[],
  note?: string
) {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Fetch User Settings
  const [userData] = await db.select({ baseCurrency: user.baseCurrency }).from(user).where(eq(user.id, userId));
  const targetCurrency = userData?.baseCurrency || "CNY";

  let totalNetWorth = new BigNumber(0);
  let totalAssets = new BigNumber(0);
  let totalLiabilities = new BigNumber(0);

  const itemsToInsert: NewSnapshotItem[] = [];

  for (const rec of records) {
    const [asset] = await db.select().from(assetAccounts).where(eq(assetAccounts.id, rec.assetId));
    if (!asset) continue;

    // Update Quantity if provided (Persist new holding amount)
    if (rec.quantity !== undefined) {
      await db.update(assetAccounts)
        .set({ quantity: rec.quantity.toString() })
        .where(eq(assetAccounts.id, rec.assetId));
    }

    const rate = await getExchangeRate(asset.currency, targetCurrency);
    // valueConverted = rec.value * rate
    const valueConverted = new BigNumber(rec.value).times(rate);

    // Categorize
    if (asset.category === "LIABILITY") {
      totalLiabilities = totalLiabilities.plus(valueConverted);
      totalNetWorth = totalNetWorth.minus(valueConverted);
    } else {
      totalAssets = totalAssets.plus(valueConverted);
      totalNetWorth = totalNetWorth.plus(valueConverted);
    }

    itemsToInsert.push({
      // id will be autogenerated? No, schema says defaultFn randomUUID. 
      // If inferred insert type makes id optional, we are good.
      // Drizzle usually matches schema defaults.
      snapshotId: "", // Placeholder, will fill after snapshot creation
      assetAccountId: rec.assetId,
      originalAmount: rec.value.toString(),
      exchangeRate: rate.toString(),
      valuation: valueConverted.toFixed(4),
    });
  }

  // Insert Header
  const newSnapshot: NewSnapshot = {
    userId,
    snapDate: dateStr,
    totalNetWorth: totalNetWorth.toFixed(4),
    totalAssets: totalAssets.toFixed(4),
    totalLiabilities: totalLiabilities.toFixed(4),
    note,
  };

  const [snapshot] = await db.insert(snapshots).values(newSnapshot).returning();

  // Insert Items
  if (itemsToInsert.length > 0) {
    // Must assign snapshotId
    const finalItems = itemsToInsert.map(item => ({
      ...item,
      snapshotId: snapshot.id
    }));

    await db.insert(snapshotItems).values(finalItems);
  }

  revalidatePath("/");
  revalidatePath("/");
  return snapshot;
}

// Import types for dashboard data
import { ChartData, DashboardData, SnapshotHistoryItem } from "@/components/dashboard/types";

export async function getDashboardData(): Promise<DashboardData | null> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // 1. Fetch User Settings
  const [userData] = await db.select({ baseCurrency: user.baseCurrency }).from(user).where(eq(user.id, userId));
  const currency = userData?.baseCurrency || "CNY";

  // 2. Fetch History
  const history = await db.select().from(snapshots)
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.snapDate), desc(snapshots.createdAt));

  // 3. Process Latest Snapshot
  const latest = history[0];
  let assetsTotal = 0;
  let liabilitiesTotal = 0;

  if (latest) {
    assetsTotal = parseFloat(latest.totalAssets || "0");
    liabilitiesTotal = parseFloat(latest.totalLiabilities || "0");
  }

  // Helper to safely format date
  const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return String(date);
  };

  // 4. Trend
  // Reverse history for chart (Oldest -> Newest)
  const trend = [...history].reverse().map(h => ({
    date: formatDate(h.snapDate),
    value: parseFloat(h.totalNetWorth)
  }));

  // 5. Asset Data (Pie Chart + Comparison)
  let pieChartData: ChartData[] = [];
  let assetChanges: import("@/components/dashboard/types").AssetChange[] = [];

  if (latest) {
    const latestItems = await db.select({
      assetId: assetAccounts.id,
      name: assetAccounts.name,
      value: snapshotItems.valuation,
      category: assetAccounts.category
    })
      .from(snapshotItems)
      .innerJoin(assetAccounts, eq(snapshotItems.assetAccountId, assetAccounts.id))
      .where(eq(snapshotItems.snapshotId, latest.id));

    // Construct Pie Chart Data
    pieChartData = latestItems.map(item => ({
      name: item.name,
      value: parseFloat(item.value || '0'),
      category: item.category
    }));

    // Construct Comparison Data (Compare with latest snapshot of PREVIOUS month)
    // Find previous snapshot that is NOT in the same month as current
    let previous: typeof history[0] | undefined;

    const getYearMonth = (dateStr: string | Date | null) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${d.getMonth() + 1}`;
    };

    const currentYM = getYearMonth(latest.snapDate);

    // Start searching from index 1 (history is sorted desc by date)
    for (let i = 1; i < history.length; i++) {
      const ym = getYearMonth(history[i].snapDate);
      if (ym !== currentYM) {
        previous = history[i];
        break;
      }
    }

    if (previous) {
      const previousItems = await db.select({
        assetId: snapshotItems.assetAccountId,
        value: snapshotItems.valuation
      })
        .from(snapshotItems)
        .where(eq(snapshotItems.snapshotId, previous.id));

      const prevMap = new Map(previousItems.map(i => [i.assetId, parseFloat(i.value || '0')]));

      assetChanges = latestItems.map(item => {
        const curr = parseFloat(item.value || '0');
        const prev = prevMap.get(item.assetId) || 0;
        const diff = curr - prev;

        // Calculate percent change
        let pct = 0;
        if (prev !== 0) {
          pct = (diff / prev) * 100;
        } else if (curr !== 0) {
          pct = 100; // New asset (0 -> Value) treated as +100% gain effectively
        }

        return {
          assetId: item.assetId,
          name: item.name,
          category: item.category,
          currentValue: curr,
          previousValue: prev,
          changeValue: diff,
          changePercentage: pct,
          isNew: !prevMap.has(item.assetId)
        };
      }).sort((a, b) => Math.abs(b.changeValue) - Math.abs(a.changeValue)); // Sort by impact

      // Merge change data back to pieChartData
      const changeMap = new Map(assetChanges.map(c => [c.name, c.changePercentage]));
      pieChartData = pieChartData.map(p => ({
        ...p,
        changePercentage: changeMap.get(p.name) ?? 0
      }));
    }
  }

  const snapshotHistory: SnapshotHistoryItem[] = history.map(h => ({
    ...h,
    date: formatDate(h.snapDate),
    totalNetWorthCny: parseFloat(h.totalNetWorth),
    createdAt: h.createdAt,
  }));

  // ... existing code ...
  return {
    netWorth: latest ? parseFloat(latest.totalNetWorth) : 0,
    assets: assetsTotal,
    liabilities: liabilitiesTotal,
    trend,
    pieChartData,
    assetChanges,
    snapshots: snapshotHistory,
    currency
  };
}

export async function getSnapshotDetails(snapshotId: string) {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) return null;

  // Fetch snapshot info
  const [snapshot] = await db.select().from(snapshots).where(eq(snapshots.id, snapshotId));
  if (!snapshot) return null;

  // Fetch items with asset details
  const items = await db.select({
    id: snapshotItems.id,
    assetName: assetAccounts.name,
    assetCategory: assetAccounts.category,
    originalAmount: snapshotItems.originalAmount,
    valuation: snapshotItems.valuation,
    currency: assetAccounts.currency,
  })
    .from(snapshotItems)
    .innerJoin(assetAccounts, eq(snapshotItems.assetAccountId, assetAccounts.id))
    .where(eq(snapshotItems.snapshotId, snapshotId))
    .orderBy(desc(snapshotItems.valuation));

  return {
    snapshot: {
      ...snapshot,
      totalNetWorth: parseFloat(snapshot.totalNetWorth),
      totalAssets: parseFloat(snapshot.totalAssets || "0"),
      totalLiabilities: parseFloat(snapshot.totalLiabilities || "0"),
    },
    items: items.map(item => ({
      ...item,
      originalAmount: parseFloat(item.originalAmount),
      valuation: parseFloat(item.valuation)
    }))
  };
}
