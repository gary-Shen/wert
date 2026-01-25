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

export type AssetChange = {
  assetId: string;
  name: string;
  category: string;
  currentValue: number;
  previousValue: number;
  changeValue: number;
  changePercentage: number;
  isNew: boolean;
  isRemoved: boolean;
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

  // Helper function to process single asset with timeout
  const processAssetWithTimeout = async (asset: typeof activeAssets[0], timeoutMs: number = 15000) => {
    const prevVal = previousRecordsMap.get(asset.id) ?? 0;

    // Create a timeout promise
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    // Process asset promise
    const processPromise = (async () => {
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

        try {
          const price = await fetchPrice(symbolStr);
          if (price !== null) {
            unitPrice = price;
            calculated = price * quantity;
          }
        } catch (e) {
          console.error(`Failed to fetch price for ${symbolStr}:`, e);
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
      let rate = new BigNumber(1);
      try {
        rate = await getExchangeRate(asset.currency, targetCurrency);
      } catch (e) {
        console.error(`Failed to get exchange rate for ${asset.currency}:`, e);
      }

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
    })();

    // Race between process and timeout
    const result = await Promise.race([processPromise, timeoutPromise]);

    // If timeout, return fallback draft
    if (result === null) {
      console.warn(`Asset processing timed out for ${asset.name}`);
      return {
        assetId: asset.id,
        name: asset.name,
        type: asset.category,
        currency: asset.currency,
        previousValue: prevVal,
        calculatedValue: prevVal,
        currentValue: prevVal,
        isDirty: false,
        exchangeRate: 1,
        quantity: asset.quantity ? parseFloat(asset.quantity) : 0,
        price: 0,
        symbol: asset.symbol || undefined,
        market: asset.market || undefined,
      };
    }

    return result;
  };

  const drafts = await Promise.all(activeAssets.map(asset => processAssetWithTimeout(asset)));

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

  // Prepare data outside transaction (includes async external calls)
  let totalNetWorth = new BigNumber(0);
  let totalAssets = new BigNumber(0);
  let totalLiabilities = new BigNumber(0);

  const itemsToInsert: NewSnapshotItem[] = [];
  const quantityUpdates: Array<{ assetId: string; quantity: string }> = [];

  for (const rec of records) {
    const [asset] = await db.select().from(assetAccounts).where(eq(assetAccounts.id, rec.assetId));
    if (!asset) continue;

    // Collect quantity updates for transaction
    if (rec.quantity !== undefined) {
      quantityUpdates.push({
        assetId: rec.assetId,
        quantity: rec.quantity.toString()
      });
    }

    const rate = await getExchangeRate(asset.currency, targetCurrency);
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

  // Use transaction to ensure atomicity
  const snapshot = await db.transaction(async (tx) => {
    // Update asset quantities
    for (const update of quantityUpdates) {
      await tx.update(assetAccounts)
        .set({ quantity: update.quantity })
        .where(eq(assetAccounts.id, update.assetId));
    }

    // Insert snapshot header
    const [inserted] = await tx.insert(snapshots).values(newSnapshot).returning();

    // Insert items
    if (itemsToInsert.length > 0) {
      const finalItems = itemsToInsert.map(item => ({
        ...item,
        snapshotId: inserted.id
      }));
      await tx.insert(snapshotItems).values(finalItems);
    }

    return inserted;
  });

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

    // Construct Comparison Data (Compare with the PREVIOUS snapshot)
    // Changed from "previous different month" to "previous snapshot" (history[1])
    const previous = history[1];

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
    assetAccountId: snapshotItems.assetAccountId,
    assetName: assetAccounts.name,
    assetCategory: assetAccounts.category,
    originalAmount: snapshotItems.originalAmount,
    exchangeRate: snapshotItems.exchangeRate,
    valuation: snapshotItems.valuation,
    currency: assetAccounts.currency,
    symbol: assetAccounts.symbol,
    quantity: assetAccounts.quantity,
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
      exchangeRate: parseFloat(item.exchangeRate),
      valuation: parseFloat(item.valuation),
      quantity: item.quantity ? parseFloat(item.quantity) : undefined,
    }))
  };
}

// Update snapshot data
export interface UpdateSnapshotData {
  snapDate?: string;
  note?: string;
  items: Array<{
    id?: string;
    assetAccountId: string;
    originalAmount: number;
    quantity?: number;
  }>;
}

export async function updateSnapshot(
  snapshotId: string,
  data: UpdateSnapshotData
): Promise<Snapshot | null> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Verify ownership
  const [existing] = await db.select().from(snapshots)
    .where(and(eq(snapshots.id, snapshotId), eq(snapshots.userId, userId)));

  if (!existing) {
    throw new Error("Snapshot not found");
  }

  // Fetch User Settings
  const [userData] = await db.select({ baseCurrency: user.baseCurrency }).from(user).where(eq(user.id, userId));
  const targetCurrency = userData?.baseCurrency || "CNY";

  // Prepare data outside transaction (includes async external calls)
  let totalNetWorth = new BigNumber(0);
  let totalAssets = new BigNumber(0);
  let totalLiabilities = new BigNumber(0);

  const newItems: NewSnapshotItem[] = [];
  const quantityUpdates: Array<{ assetId: string; quantity: string }> = [];

  for (const itemData of data.items) {
    const [asset] = await db.select().from(assetAccounts).where(eq(assetAccounts.id, itemData.assetAccountId));
    if (!asset) continue;

    // Collect quantity updates for transaction
    if (itemData.quantity !== undefined) {
      quantityUpdates.push({
        assetId: itemData.assetAccountId,
        quantity: itemData.quantity.toString()
      });
    }

    const rate = await getExchangeRate(asset.currency, targetCurrency);
    const valueConverted = new BigNumber(itemData.originalAmount).times(rate);

    if (asset.category === "LIABILITY") {
      totalLiabilities = totalLiabilities.plus(valueConverted);
      totalNetWorth = totalNetWorth.minus(valueConverted);
    } else {
      totalAssets = totalAssets.plus(valueConverted);
      totalNetWorth = totalNetWorth.plus(valueConverted);
    }

    newItems.push({
      snapshotId,
      assetAccountId: itemData.assetAccountId,
      originalAmount: itemData.originalAmount.toString(),
      exchangeRate: rate.toString(),
      valuation: valueConverted.toFixed(4),
    });
  }

  // Execute all database operations in a transaction
  const updated = await db.transaction(async (tx) => {
    // Update asset quantities
    for (const update of quantityUpdates) {
      await tx.update(assetAccounts)
        .set({ quantity: update.quantity })
        .where(eq(assetAccounts.id, update.assetId));
    }

    // Delete old items
    await tx.delete(snapshotItems).where(eq(snapshotItems.snapshotId, snapshotId));

    // Insert new items
    if (newItems.length > 0) {
      await tx.insert(snapshotItems).values(newItems);
    }

    // Update snapshot header
    const [result] = await tx.update(snapshots)
      .set({
        snapDate: data.snapDate || existing.snapDate,
        note: data.note !== undefined ? data.note : existing.note,
        totalNetWorth: totalNetWorth.toFixed(4),
        totalAssets: totalAssets.toFixed(4),
        totalLiabilities: totalLiabilities.toFixed(4),
      })
      .where(eq(snapshots.id, snapshotId))
      .returning();

    return result;
  });

  revalidatePath("/");
  return updated;
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Verify ownership
  const [existing] = await db.select().from(snapshots)
    .where(and(eq(snapshots.id, snapshotId), eq(snapshots.userId, userId)));

  if (!existing) {
    throw new Error("Snapshot not found");
  }

  // Delete snapshot (cascade will delete items)
  await db.delete(snapshots).where(eq(snapshots.id, snapshotId));

  revalidatePath("/");
}

// Get comparison data between two snapshots
export async function getComparisonData(
  currentSnapshotId: string,
  compareToSnapshotId: string
): Promise<AssetChange[]> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) return [];

  // Fetch current snapshot items
  const currentItems = await db.select({
    assetId: snapshotItems.assetAccountId,
    name: assetAccounts.name,
    category: assetAccounts.category,
    value: snapshotItems.valuation
  })
    .from(snapshotItems)
    .innerJoin(assetAccounts, eq(snapshotItems.assetAccountId, assetAccounts.id))
    .where(eq(snapshotItems.snapshotId, currentSnapshotId));

  // Fetch comparison snapshot items
  const compareItems = await db.select({
    assetId: snapshotItems.assetAccountId,
    value: snapshotItems.valuation
  })
    .from(snapshotItems)
    .where(eq(snapshotItems.snapshotId, compareToSnapshotId));

  const compareMap = new Map(compareItems.map(i => [i.assetId, parseFloat(i.value || '0')]));
  const currentAssetIds = new Set(currentItems.map(i => i.assetId));

  // Calculate changes
  const changes: AssetChange[] = currentItems.map(item => {
    const curr = parseFloat(item.value || '0');
    const prev = compareMap.get(item.assetId) || 0;
    const diff = curr - prev;

    let pct = 0;
    if (prev !== 0) {
      pct = (diff / prev) * 100;
    } else if (curr !== 0) {
      pct = 100;
    }

    return {
      assetId: item.assetId,
      name: item.name,
      category: item.category,
      currentValue: curr,
      previousValue: prev,
      changeValue: diff,
      changePercentage: pct,
      isNew: !compareMap.has(item.assetId),
      isRemoved: false,
    };
  });

  // Find removed assets (in compare but not in current)
  for (const compareItem of compareItems) {
    if (!currentAssetIds.has(compareItem.assetId)) {
      // Fetch asset details
      const [asset] = await db.select({
        name: assetAccounts.name,
        category: assetAccounts.category
      }).from(assetAccounts).where(eq(assetAccounts.id, compareItem.assetId));

      if (asset) {
        const prev = parseFloat(compareItem.value || '0');
        changes.push({
          assetId: compareItem.assetId,
          name: asset.name,
          category: asset.category,
          currentValue: 0,
          previousValue: prev,
          changeValue: -prev,
          changePercentage: -100,
          isNew: false,
          isRemoved: true,
        });
      }
    }
  }

  // Sort by absolute change value
  return changes.sort((a, b) => Math.abs(b.changeValue) - Math.abs(a.changeValue));
}

// Get all snapshots for comparison selector
export async function getSnapshotsForComparison(): Promise<Array<{ id: string; date: string; netWorth: number }>> {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) return [];

  const history = await db.select({
    id: snapshots.id,
    snapDate: snapshots.snapDate,
    totalNetWorth: snapshots.totalNetWorth
  })
    .from(snapshots)
    .where(eq(snapshots.userId, session.user.id))
    .orderBy(desc(snapshots.snapDate), desc(snapshots.createdAt));

  return history.map(h => ({
    id: h.id,
    date: h.snapDate,
    netWorth: parseFloat(h.totalNetWorth)
  }));
}
