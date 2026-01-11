import { auth } from "@/auth";
import { db } from "@/db";
import { assetAccounts, snapshotItems, snapshots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { SnapCarousel } from "@/components/dashboard/SnapCarousel";
import { SnapButton } from "@/components/snap-flow/SnapButton";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch History
  const history = await db.select().from(snapshots)
    .where(eq(snapshots.userId, userId))
    .orderBy(desc(snapshots.snapDate));

  // 2. Fetch Latest Details
  const latest = history[0];
  let assetsTotal = 0;
  let liabilitiesTotal = 0;

  if (latest) {
    // Postgres decimals return as strings
    assetsTotal = parseFloat(latest.totalAssets || "0");
    liabilitiesTotal = parseFloat(latest.totalLiabilities || "0");
  }

  // 3. Trend
  // Reverse history for chart (Oldest -> Newest)
  const trend = [...history].reverse().map(h => ({
    date: typeof h.snapDate === 'string' ? h.snapDate : h.snapDate.toISOString().split('T')[0],
    value: parseFloat(h.totalNetWorth)
  }));

  const data = {
    netWorth: latest ? parseFloat(latest.totalNetWorth) : 0,
    assets: assetsTotal,
    liabilities: liabilitiesTotal,
    trend,
    snapshots: history.map(h => ({
      ...h,
      totalNetWorthCny: parseFloat(h.totalNetWorth), // Adapt for component strict type if needed
      date: typeof h.snapDate === 'string' ? h.snapDate : h.snapDate.toISOString().split('T')[0]
    }))
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <SnapCarousel data={data} />
      <SnapButton />
    </main>
  );
}
