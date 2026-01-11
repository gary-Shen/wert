'use server'

import { auth } from "@/auth";
import { db } from "@/db";
import { assetAccounts, snapshots, snapshotItems } from "@/db/schema";
import { calculateDepreciation, calculateSimpleLoanAmortization } from "@/lib/logic/calculator";
import { getExchangeRate } from "@/lib/services/currency";
import { desc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type AssetSnapshotDraft = {
  assetId: string; // UUID
  name: string;
  type: string;
  currency: string;
  previousValue: number | null;
  calculatedValue: number;
  currentValue: number;
  isDirty: boolean;
};

export async function prepareSnapshotDraft(): Promise<AssetSnapshotDraft[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  // 1. Fetch Active Assets
  const activeAssets = await db.select().from(assetAccounts).where(
    and(eq(assetAccounts.userId, userId), eq(assetAccounts.isArchived, false))
  );

  // 2. Fetch Last Snapshot
  const lastSnapshotList = await db.select().from(snapshots)
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.snapDate))
    .limit(1);
  const lastSnapshot = lastSnapshotList[0];
  
  let previousRecordsMap = new Map<string, number>();
  if (lastSnapshot) {
     const items = await db.select().from(snapshotItems).where(eq(snapshotItems.snapshotId, lastSnapshot.id));
     items.forEach(r => previousRecordsMap.set(r.assetAccountId, parseFloat(r.originalAmount)));
  }

  const drafts: AssetSnapshotDraft[] = [];

  for (const asset of activeAssets) {
    const prevVal = previousRecordsMap.get(asset.id) ?? 0;
    let calculated = prevVal;

    // Apply Automation
    if (asset.autoConfig) {
      const meta = asset.autoConfig as any; 

      // Logic based on new Enum categories
      if (asset.category === "REAL_ESTATE" && meta.purchasePrice) { // Mapped FIXED -> REAL_ESTATE roughly
         // Or check "type" in json? Assuming direct mapping from Schema Enums
        calculated = calculateDepreciation(
          meta.purchasePrice,
          meta.purchaseDate,
          meta.lifespanMonths || 120 // Default
        );
      } else if (asset.category === "LIABILITY" && meta.monthlyPayment) {
         calculated = calculateSimpleLoanAmortization(
             meta.initialLoan || prevVal, // If no initial loan, maybe track from prev?
             meta.monthlyPayment,
             meta.repaymentDate || meta.paymentDay // Handle schema variance
         );
      }
    }

    drafts.push({
      assetId: asset.id,
      name: asset.name,
      type: asset.category,
      currency: asset.currency,
      previousValue: prevVal,
      calculatedValue: calculated,
      currentValue: calculated, 
      isDirty: false,
    });
  }

  return drafts;
}

export async function commitSnapshot(
  dateStr: string,
  records: { assetId: string; value: number }[],
  note?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  let totalNetWorthCny = 0;
  let totalAssetsCny = 0;
  let totalLiabilitiesCny = 0;

  const itemsToInsert = [];

  for (const rec of records) {
    const [asset] = await db.select().from(assetAccounts).where(eq(assetAccounts.id, rec.assetId));
    if (!asset) continue;

    const rate = await getExchangeRate(asset.currency);
    const valueCny = rec.value * rate;
    
    // Categorize
    if (asset.category === "LIABILITY") {
        totalLiabilitiesCny += valueCny; // Positive magnitude
        totalNetWorthCny -= valueCny;
    } else {
        totalAssetsCny += valueCny;
        totalNetWorthCny += valueCny;
    }

    itemsToInsert.push({
      assetAccountId: rec.assetId,
      originalAmount: rec.value.toString(),
      exchangeRate: rate.toString(),
      valuation: valueCny.toFixed(4), // Store decimal string
    });
  }

  // Insert Header
  const [snapshot] = await db.insert(snapshots).values({
    userId,
    snapDate: dateStr, // string 'YYYY-MM-DD' fits 'date' column
    totalNetWorth: totalNetWorthCny.toFixed(4),
    totalAssets: totalAssetsCny.toFixed(4),
    totalLiabilities: totalLiabilitiesCny.toFixed(4),
    note
  }).returning();

  // Insert Items
  if (itemsToInsert.length > 0) {
      await db.insert(snapshotItems).values(
          itemsToInsert.map(r => ({
              snapshotId: snapshot.id,
              ...r
          }))
      );
  }

  revalidatePath("/");
  return snapshot;
}
