import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserSettings {
  baseCurrency: string
  locale: string
  setupComplete: boolean
  region: 'CN' | 'OVERSEAS' | null
  userName: string | null
  userEmail: string | null
  userImage: string | null
}

interface UserState extends UserSettings {
  hydrate: (settings: Partial<UserSettings>) => void
  setBaseCurrency: (currency: string) => void
  setLocale: (locale: string) => void
  setSetupComplete: (complete: boolean) => void
  setRegion: (region: 'CN' | 'OVERSEAS' | null) => void
  reset: () => void
}

const defaultState: UserSettings = {
  baseCurrency: 'CNY',
  locale: 'zh-CN',
  setupComplete: false,
  region: null,
  userName: null,
  userEmail: null,
  userImage: null,
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...defaultState,
      hydrate: (settings) => set((state) => ({ ...state, ...settings })),
      setBaseCurrency: (currency) => set({ baseCurrency: currency }),
      setLocale: (locale) => set({ locale }),
      setSetupComplete: (complete) => set({ setupComplete: complete }),
      setRegion: (region) => set({ region }),
      reset: () => set(defaultState),
    }),
    {
      name: 'snapworth-user-settings',
      partialize: (state) => ({
        baseCurrency: state.baseCurrency,
        locale: state.locale,
        setupComplete: state.setupComplete,
        region: state.region,
      }),
    }
  )
)
