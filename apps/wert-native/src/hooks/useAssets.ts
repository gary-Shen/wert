import { useCallback, useEffect, useState } from "react";
import { db } from "@/db";
import { assetAccounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { useAssetsStore, type AssetAccount } from "@/stores/assetsStore";
import { showToast } from "@/components/ui/toast";

/**
 * 资产管理 Hook
 * 提供资产的 CRUD 操作
 */
export function useAssets() {
  const store = useAssetsStore();
  const [isReady, setIsReady] = useState(false);

  // 从数据库加载资产
  const loadAssets = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);

    try {
      const result = await db
        .select()
        .from(assetAccounts)
        .orderBy(desc(assetAccounts.order));

      const mapped: AssetAccount[] = result.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        currency: row.currency,
        symbol: row.symbol,
        market: row.market,
        quantity: row.quantity,
        costBasis: row.costBasis,
        autoConfig: row.autoConfig,
        isActive: row.isActive,
        order: row.order,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));

      store.setAssets(mapped);
      setIsReady(true);
    } catch (error) {
      console.error("Failed to load assets:", error);
      store.setError("加载资产失败");
    } finally {
      store.setLoading(false);
    }
  }, []);

  // 创建资产
  const createAsset = useCallback(
    async (data: {
      name: string;
      category: AssetAccount["category"];
      currency: string;
      symbol?: string;
      market?: string;
    }) => {
      try {
        const id = `asset_${Date.now()}`;
        const now = new Date();
        const maxOrder = store.assets.reduce(
          (max, a) => Math.max(max, a.order),
          0
        );

        await db.insert(assetAccounts).values({
          id,
          name: data.name,
          category: data.category,
          currency: data.currency,
          symbol: data.symbol || null,
          market: data.market || null,
          isActive: true,
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        });

        const newAsset: AssetAccount = {
          id,
          name: data.name,
          category: data.category,
          currency: data.currency,
          symbol: data.symbol || null,
          market: data.market || null,
          isActive: true,
          order: maxOrder + 1,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        store.addAsset(newAsset);
        showToast.success("资产创建成功");
        return newAsset;
      } catch (error) {
        console.error("Failed to create asset:", error);
        showToast.error("创建失败");
        throw error;
      }
    },
    [store.assets]
  );

  // 更新资产
  const updateAsset = useCallback(
    async (id: string, updates: Partial<Omit<AssetAccount, "id" | "createdAt">>) => {
      try {
        // 移除不能更新的字段
        const { createdAt, ...safeUpdates } = updates as any;

        await db
          .update(assetAccounts)
          .set({
            ...safeUpdates,
            updatedAt: new Date(),
          })
          .where(eq(assetAccounts.id, id));

        store.updateAsset(id, updates);
        showToast.success("资产已更新");
      } catch (error) {
        console.error("Failed to update asset:", error);
        showToast.error("更新失败");
        throw error;
      }
    },
    []
  );

  // 删除资产
  const deleteAsset = useCallback(async (id: string) => {
    try {
      await db.delete(assetAccounts).where(eq(assetAccounts.id, id));
      store.removeAsset(id);
      showToast.success("资产已删除");
    } catch (error) {
      console.error("Failed to delete asset:", error);
      showToast.error("删除失败");
      throw error;
    }
  }, []);

  // 切换活跃状态
  const toggleAssetActive = useCallback(async (id: string) => {
    const asset = store.assets.find((a) => a.id === id);
    if (!asset) return;

    try {
      await db
        .update(assetAccounts)
        .set({
          isActive: !asset.isActive,
          updatedAt: new Date(),
        })
        .where(eq(assetAccounts.id, id));

      store.toggleActive(id);
    } catch (error) {
      console.error("Failed to toggle asset:", error);
      throw error;
    }
  }, [store.assets]);

  // 初始化加载
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  return {
    assets: store.assets,
    activeAssets: store.getActiveAssets(),
    isLoading: store.isLoading,
    isReady,
    error: store.error,
    loadAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    toggleAssetActive,
  };
}
