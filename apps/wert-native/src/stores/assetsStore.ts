import { create } from "zustand";
import type { AssetCategory } from "@/db/schema";

/**
 * 资产账户类型
 */
export interface AssetAccount {
  id: string;
  name: string;
  category: AssetCategory;
  currency: string;
  symbol?: string | null;
  market?: string | null;
  quantity?: number | null;
  costBasis?: number | null;
  autoConfig?: any | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 资产 Store 状态
 */
interface AssetsState {
  // 数据
  assets: AssetAccount[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setAssets: (assets: AssetAccount[]) => void;
  addAsset: (asset: AssetAccount) => void;
  updateAsset: (id: string, updates: Partial<AssetAccount>) => void;
  removeAsset: (id: string) => void;
  toggleActive: (id: string) => void;
  reorderAssets: (ids: string[]) => void;

  // 查询
  getActiveAssets: () => AssetAccount[];
  getAssetsByCategory: (category: AssetCategory) => AssetAccount[];

  // 状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  // 初始状态
  assets: [],
  isLoading: false,
  error: null,

  // 设置资产列表
  setAssets: (assets) => set({ assets }),

  // 添加资产
  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),

  // 更新资产
  updateAsset: (id, updates) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    })),

  // 删除资产（软删除，设为非活跃）
  removeAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),

  // 切换活跃状态
  toggleActive: (id) =>
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a
      ),
    })),

  // 重新排序
  reorderAssets: (ids) =>
    set((state) => {
      const orderMap = new Map(ids.map((id, index) => [id, index]));
      return {
        assets: [...state.assets].sort(
          (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
        ),
      };
    }),

  // 获取活跃资产
  getActiveAssets: () => get().assets.filter((a) => a.isActive),

  // 按类别获取资产
  getAssetsByCategory: (category) =>
    get().assets.filter((a) => a.category === category),

  // 状态管理
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ assets: [], isLoading: false, error: null }),
}));
