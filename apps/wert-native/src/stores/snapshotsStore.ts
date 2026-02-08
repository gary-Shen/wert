import { create } from "zustand";

/**
 * 快照项类型
 */
export interface SnapshotItem {
  id: string;
  snapshotId: string;
  assetAccountId: string;
  assetName: string;
  category: string;
  currency: string;
  value: number;
  quantity?: number | null;
  price?: number | null;
  exchangeRate: number;
  valueInBase: number;
}

/**
 * 快照类型
 */
export interface Snapshot {
  id: string;
  date: string;
  note?: string | null;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  currency: string;
  createdAt: string;
  items: SnapshotItem[];
}

/**
 * 快照 Store 状态
 */
interface SnapshotsState {
  // 数据
  snapshots: Snapshot[];
  currentSnapshot: Snapshot | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSnapshots: (snapshots: Snapshot[]) => void;
  addSnapshot: (snapshot: Snapshot) => void;
  updateSnapshot: (id: string, updates: Partial<Snapshot>) => void;
  removeSnapshot: (id: string) => void;
  setCurrentSnapshot: (snapshot: Snapshot | null) => void;

  // 查询
  getLatestSnapshot: () => Snapshot | null;
  getSnapshotsByDateRange: (start: string, end: string) => Snapshot[];
  getTrendData: () => { date: string; value: number }[];

  // 状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSnapshotsStore = create<SnapshotsState>((set, get) => ({
  // 初始状态
  snapshots: [],
  currentSnapshot: null,
  isLoading: false,
  error: null,

  // 设置快照列表
  setSnapshots: (snapshots) => set({ snapshots }),

  // 添加快照
  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      currentSnapshot: snapshot,
    })),

  // 更新快照
  updateSnapshot: (id, updates) =>
    set((state) => ({
      snapshots: state.snapshots.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  // 删除快照
  removeSnapshot: (id) =>
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== id),
      currentSnapshot:
        state.currentSnapshot?.id === id ? null : state.currentSnapshot,
    })),

  // 设置当前快照
  setCurrentSnapshot: (snapshot) => set({ currentSnapshot: snapshot }),

  // 获取最新快照
  getLatestSnapshot: () => {
    const { snapshots } = get();
    if (snapshots.length === 0) return null;
    return snapshots.reduce((latest, current) =>
      new Date(current.date) > new Date(latest.date) ? current : latest
    );
  },

  // 按日期范围获取快照
  getSnapshotsByDateRange: (start, end) => {
    const { snapshots } = get();
    const startDate = new Date(start);
    const endDate = new Date(end);
    return snapshots.filter((s) => {
      const date = new Date(s.date);
      return date >= startDate && date <= endDate;
    });
  },

  // 获取趋势数据（用于图表）
  getTrendData: () => {
    const { snapshots } = get();
    return snapshots
      .map((s) => ({ date: s.date, value: s.netWorth }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  // 状态管理
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({ snapshots: [], currentSnapshot: null, isLoading: false, error: null }),
}));
