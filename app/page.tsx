import { auth } from "@/auth";
import { db } from "@/db";
import { assetAccounts, snapshotItems, snapshots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { SnapCarousel } from "@/components/dashboard/SnapCarousel";
import { SnapButton } from "@/components/snap-flow/SnapButton";
import { redirect } from "next/navigation";
import { ChartData, DashboardData, SnapshotHistoryItem } from "@/components/dashboard/types";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch History
  const history = await db.select().from(snapshots)
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.snapDate), desc(snapshots.createdAt));

  // 2. Fetch Latest Details
  const latest = history[0];
  let assetsTotal = 0;
  let liabilitiesTotal = 0;

  if (latest) {
    // Postgres decimals return as strings
    assetsTotal = parseFloat(latest.totalAssets || "0");
    liabilitiesTotal = parseFloat(latest.totalLiabilities || "0");
  }

  // Helper to safely format date
  const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return String(date);
  };

  // 3. Trend
  // Reverse history for chart (Oldest -> Newest)
  const trend = [...history].reverse().map(h => ({
    date: formatDate(h.snapDate),
    value: parseFloat(h.totalNetWorth)
  }));

  // 4. Pie Chart Data (Latest Snapshot Breakdown)
  let pieChartData: ChartData[] = [];
  if (latest) {
    const items = await db.select({
      name: assetAccounts.name,
      value: snapshotItems.valuation,
      category: assetAccounts.category
    })
      .from(snapshotItems)
      .innerJoin(assetAccounts, eq(snapshotItems.assetAccountId, assetAccounts.id))
      .where(eq(snapshotItems.snapshotId, latest.id));

    pieChartData = items.map(item => ({
      name: item.name,
      value: parseFloat(item.value || '0'),
      category: item.category
    }));
  }

  const snapshotHistory: SnapshotHistoryItem[] = history.map(h => ({
    ...h,
    date: formatDate(h.snapDate),
    totalNetWorthCny: parseFloat(h.totalNetWorth),
    // Ensure strict type compliance
    createdAt: h.createdAt,
  }));

  const data: DashboardData = {
    netWorth: latest ? parseFloat(latest.totalNetWorth) : 0,
    assets: assetsTotal,
    liabilities: liabilitiesTotal,
    trend,
    pieChartData,
    snapshots: snapshotHistory
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <SnapCarousel data={data} />
      <SnapButton />
    </main>
  );
}
