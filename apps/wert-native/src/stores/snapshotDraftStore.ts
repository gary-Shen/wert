import { create } from "zustand";
import type { AssetCategory } from "@/db/schema";

export type SnapshotStep = "IDLE" | "LOADING" | "REVIEW" | "SAVING";

export interface AssetSnapshotDraft {
  assetId: string;
  name: string;
  category: AssetCategory;
  currency: string;
  // 当前值
  currentValue: number;
  previousValue: number;
  // 投资相关
  quantity?: number;
  price?: number;
  // 汇率
  exchangeRate: number;
  // 是否已修改
  isDirty: boolean;
  // 资产类型标识
  type: "ASSET" | "LIABILITY";
}

interface SnapshotDraftState {
  // Draft 数据
  drafts: AssetSnapshotDraft[];
  date: string;
  note: string;
  step: SnapshotStep;

  // Actions
  setDrafts: (drafts: AssetSnapshotDraft[]) => void;
  setDate: (date: string) => void;
  setNote: (note: string) => void;
  setStep: (step: SnapshotStep) => void;

  // 更新单个 draft
  updateDraft: (assetId: string, updates: Partial<AssetSnapshotDraft>) => void;
  updateDraftValue: (assetId: string, value: number) => void;
  updateDraftQuantity: (assetId: string, quantity: number) => void;
  updateDraftPrice: (assetId: string, price: number) => void;

  // 计算
  getTotalNetWorth: () => number;

  // 重置
  reset: () => void;
}

const getDefaultDate = () => new Date().toISOString().split("T")[0];

export const useSnapshotDraftStore = create<SnapshotDraftState>((set, get) => ({
  // 初始状态
  drafts: [],
  date: getDefaultDate(),
  note: "",
  step: "IDLE",

  // Setters
  setDrafts: (drafts) => set({ drafts }),
  setDate: (date) => set({ date }),
  setNote: (note) => set({ note }),
  setStep: (step) => set({ step }),

  // 更新单个 draft
  updateDraft: (assetId, updates) =>
    set((state) => ({
      drafts: state.drafts.map((d) =>
        d.assetId === assetId ? { ...d, ...updates, isDirty: true } : d
      ),
    })),

  updateDraftValue: (assetId, value) =>
    set((state) => ({
      drafts: state.drafts.map((d) =>
        d.assetId === assetId ? { ...d, currentValue: value, isDirty: true } : d
      ),
    })),

  updateDraftQuantity: (assetId, quantity) =>
    set((state) => ({
      drafts: state.drafts.map((d) => {
        if (d.assetId !== assetId) return d;
        const price = d.price || 0;
        return { ...d, quantity, currentValue: quantity * price, isDirty: true };
      }),
    })),

  updateDraftPrice: (assetId, price) =>
    set((state) => ({
      drafts: state.drafts.map((d) => {
        if (d.assetId !== assetId) return d;
        const qty = d.quantity || 0;
        return { ...d, price, currentValue: qty * price, isDirty: true };
      }),
    })),

  // 计算总净值
  getTotalNetWorth: () => {
    const { drafts } = get();
    return drafts.reduce((sum, item) => {
      const valConverted = item.currentValue * (item.exchangeRate || 1);
      return item.type === "LIABILITY" ? sum - valConverted : sum + valConverted;
    }, 0);
  },

  // 重置
  reset: () =>
    set({
      drafts: [],
      date: getDefaultDate(),
      note: "",
      step: "IDLE",
    }),
}));
