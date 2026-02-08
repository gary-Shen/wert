import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserStoreState {
  // 用户设置
  baseCurrency: string;
  locale: string;
  region: "CN" | "OVERSEAS" | null;
  setupComplete: boolean;

  // UI 状态
  isLoading: boolean;
  error: string | null;

  // Actions
  setBaseCurrency: (currency: string) => void;
  setLocale: (locale: string) => void;
  setRegion: (region: "CN" | "OVERSEAS" | null) => void;
  setSetupComplete: (complete: boolean) => void;
  reset: () => void;
}

const defaultState = {
  baseCurrency: "CNY",
  locale: "zh-CN",
  region: null as "CN" | "OVERSEAS" | null,
  setupComplete: false,
  isLoading: false,
  error: null,
};

export const useUserStore = create<UserStoreState>()(
  persist(
    (set) => ({
      ...defaultState,

      setBaseCurrency: (currency) => set({ baseCurrency: currency }),
      setLocale: (locale) => set({ locale }),
      setRegion: (region) => set({ region }),
      setSetupComplete: (complete) => set({ setupComplete: complete }),
      reset: () => set(defaultState),
    }),
    {
      name: "assetsnap-user-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        baseCurrency: state.baseCurrency,
        locale: state.locale,
        region: state.region,
        setupComplete: state.setupComplete,
      }),
    }
  )
);
