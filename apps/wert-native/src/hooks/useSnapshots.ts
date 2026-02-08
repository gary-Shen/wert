import { useCallback, useEffect, useState } from "react";
import { db } from "@/db";
import { snapshots, snapshotItems, assetAccounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { useSnapshotsStore, type Snapshot } from "@/stores/snapshotsStore";
import { type AssetSnapshotDraft } from "@/stores/snapshotDraftStore";
import { useUserStore } from "@/stores/userStore";
import { showToast } from "@/components/ui/toast";

/**
 * 快照管理 Hook
 * 提供快照的 CRUD 操作
 */
export function useSnapshots() {
  const store = useSnapshotsStore();
  const { baseCurrency } = useUserStore();
  const [isReady, setIsReady] = useState(false);

  // 加载快照列表
  const loadSnapshots = useCallback(async (limit = 50) => {
    store.setLoading(true);
    store.setError(null);

    try {
      const result = await db
        .select()
        .from(snapshots)
        .orderBy(desc(snapshots.date))
        .limit(limit);

      // 为每个快照加载 items
      const snapshotsWithItems: Snapshot[] = await Promise.all(
        result.map(async (snap) => {
          const items = await db
            .select({
              id: snapshotItems.id,
              snapshotId: snapshotItems.snapshotId,
              assetAccountId: snapshotItems.assetAccountId,
              value: snapshotItems.value,
              quantity: snapshotItems.quantity,
              price: snapshotItems.price,
              exchangeRate: snapshotItems.exchangeRate,
              valueInBase: snapshotItems.valueInBase,
              assetName: assetAccounts.name,
              category: assetAccounts.category,
              currency: assetAccounts.currency,
            })
            .from(snapshotItems)
            .leftJoin(assetAccounts, eq(snapshotItems.assetAccountId, assetAccounts.id))
            .where(eq(snapshotItems.snapshotId, snap.id));

          return {
            id: snap.id,
            date: snap.date,
            note: snap.note,
            netWorth: snap.netWorth,
            totalAssets: snap.totalAssets ?? 0,
            totalLiabilities: snap.totalLiabilities ?? 0,
            currency: snap.currency,
            createdAt: snap.createdAt instanceof Date
              ? snap.createdAt.toISOString()
              : String(snap.createdAt),
            items: items.map((item) => ({
              id: item.id,
              snapshotId: item.snapshotId,
              assetAccountId: item.assetAccountId,
              assetName: item.assetName || "Unknown",
              category: item.category || "OTHER",
              currency: item.currency || baseCurrency,
              value: item.value,
              quantity: item.quantity ?? null,
              price: item.price ?? null,
              exchangeRate: item.exchangeRate,
              valueInBase: item.valueInBase,
            })),
          };
        })
      );

      store.setSnapshots(snapshotsWithItems);

      // 设置最新快照为当前快照
      if (snapshotsWithItems.length > 0) {
        store.setCurrentSnapshot(snapshotsWithItems[0]);
      }

      setIsReady(true);
    } catch (error) {
      console.error("Failed to load snapshots:", error);
      store.setError("加载快照失败");
    } finally {
      store.setLoading(false);
    }
  }, [baseCurrency]);

  // 创建快照
  const createSnapshot = useCallback(
    async (drafts: AssetSnapshotDraft[], date: string, note?: string) => {
      try {
        const id = `snap_${Date.now()}`;
        const now = new Date();

        // 计算汇总值
        let totalAssets = 0;
        let totalLiabilities = 0;

        drafts.forEach((d) => {
          const valueInBase = d.currentValue * d.exchangeRate;
          if (d.type === "LIABILITY") {
            totalLiabilities += valueInBase;
          } else {
            totalAssets += valueInBase;
          }
        });

        const netWorth = totalAssets - totalLiabilities;

        // 插入快照记录
        await db.insert(snapshots).values({
          id,
          date,
          note: note || null,
          netWorth,
          totalAssets,
          totalLiabilities,
          currency: baseCurrency,
          createdAt: now,
        });

        // 插入快照项
        const itemsToInsert = drafts.map((d) => ({
          id: `item_${Date.now()}_${d.assetId}`,
          snapshotId: id,
          assetAccountId: d.assetId,
          value: d.currentValue,
          quantity: d.quantity ?? null,
          price: d.price ?? null,
          exchangeRate: d.exchangeRate,
          valueInBase: d.currentValue * d.exchangeRate,
        }));

        for (const item of itemsToInsert) {
          await db.insert(snapshotItems).values(item);
        }

        // 更新 store
        const newSnapshot: Snapshot = {
          id,
          date,
          note,
          netWorth,
          totalAssets,
          totalLiabilities,
          currency: baseCurrency,
          createdAt: now.toISOString(),
          items: drafts.map((d) => ({
            id: `item_${Date.now()}_${d.assetId}`,
            snapshotId: id,
            assetAccountId: d.assetId,
            assetName: d.name,
            category: d.category,
            currency: d.currency,
            value: d.currentValue,
            quantity: d.quantity || null,
            price: d.price || null,
            exchangeRate: d.exchangeRate,
            valueInBase: d.currentValue * d.exchangeRate,
          })),
        };

        store.addSnapshot(newSnapshot);
        showToast.success("快照保存成功");
        return newSnapshot;
      } catch (error) {
        console.error("Failed to create snapshot:", error);
        showToast.error("保存失败");
        throw error;
      }
    },
    [baseCurrency]
  );

  // 更新快照
  const updateSnapshot = useCallback(
    async (
      id: string,
      data: {
        date?: string;
        note?: string | null;
        items?: Array<{
          assetAccountId: string;
          value: number;
          quantity?: number | null;
          price?: number | null;
          exchangeRate: number;
          valueInBase: number;
        }>;
      }
    ) => {
      try {
        // 如果有 items 更新，需要重算汇总值
        if (data.items) {
          // 删除旧 items
          await db.delete(snapshotItems).where(eq(snapshotItems.snapshotId, id));

          let totalAssets = 0;
          let totalLiabilities = 0;

          // 获取资产类别信息用于区分资产/负债
          const allAssets = await db.select().from(assetAccounts);
          const assetMap = new Map(allAssets.map((a) => [a.id, a]));

          // 插入新 items
          for (const item of data.items) {
            await db.insert(snapshotItems).values({
              id: `item_${Date.now()}_${item.assetAccountId}`,
              snapshotId: id,
              assetAccountId: item.assetAccountId,
              value: item.value,
              quantity: item.quantity ?? null,
              price: item.price ?? null,
              exchangeRate: item.exchangeRate,
              valueInBase: item.valueInBase,
            });

            const assetInfo = assetMap.get(item.assetAccountId);
            if (assetInfo?.category === "LIABILITY") {
              totalLiabilities += item.valueInBase;
            } else {
              totalAssets += item.valueInBase;
            }
          }

          const netWorth = totalAssets - totalLiabilities;

          // 更新 snapshot header
          await db
            .update(snapshots)
            .set({
              ...(data.date && { date: data.date }),
              ...(data.note !== undefined && { note: data.note || null }),
              netWorth,
              totalAssets,
              totalLiabilities,
            })
            .where(eq(snapshots.id, id));
        } else {
          // 仅更新 header 字段
          await db
            .update(snapshots)
            .set({
              ...(data.date && { date: data.date }),
              ...(data.note !== undefined && { note: data.note || null }),
            })
            .where(eq(snapshots.id, id));
        }

        // 重新加载快照列表以更新 store
        await loadSnapshots();
        showToast.success("快照已更新");
      } catch (error) {
        console.error("Failed to update snapshot:", error);
        showToast.error("更新失败");
        throw error;
      }
    },
    [loadSnapshots]
  );

  // 删除快照
  const deleteSnapshot = useCallback(async (id: string) => {
    try {
      // 先删除 items
      await db.delete(snapshotItems).where(eq(snapshotItems.snapshotId, id));
      // 再删除 snapshot
      await db.delete(snapshots).where(eq(snapshots.id, id));

      store.removeSnapshot(id);
      showToast.success("快照已删除");
    } catch (error) {
      console.error("Failed to delete snapshot:", error);
      showToast.error("删除失败");
      throw error;
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  return {
    snapshots: store.snapshots,
    currentSnapshot: store.currentSnapshot,
    latestSnapshot: store.getLatestSnapshot(),
    trendData: store.getTrendData(),
    isLoading: store.isLoading,
    isReady,
    error: store.error,
    loadSnapshots,
    createSnapshot,
    updateSnapshot,
    deleteSnapshot,
    setCurrentSnapshot: store.setCurrentSnapshot,
  };
}
