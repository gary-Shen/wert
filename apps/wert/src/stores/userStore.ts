import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserSettings } from '@/app/actions/user'
import { getAssets, AssetAccount } from '@/app/actions/assets'

// Helper to detect deployment errors (Action ID mismatch)
function isDeploymentError(error: any): boolean {
  if (typeof error === 'object' && error !== null) {
    const msg = error.message || ''
    return msg.includes('digest') || msg.includes('action')
  }
  return false
}

export interface UserStoreState {
  name: string | null
  email: string | null
  image: string | null
  baseCurrency: string
  locale: string
  setupComplete: boolean
  region: 'CN' | 'OVERSEAS' | null

  // Data State
  assets: AssetAccount[]

  // UI State
  isUserLoading: boolean
  isAssetsLoading: boolean
  error: string | null

  hydrate: (settings: Partial<UserStoreState>) => void
  setBaseCurrency: (currency: string) => void
  setLocale: (locale: string) => void
  setSetupComplete: (complete: boolean) => void
  setRegion: (region: 'CN' | 'OVERSEAS' | null) => void
  reset: () => void

  fetchUserSettings: () => Promise<void>
  fetchAssets: () => Promise<void>
}

const defaultState = {
  name: null,
  email: null,
  image: null,
  baseCurrency: 'CNY',
  locale: 'zh-CN',
  setupComplete: false,
  region: null as 'CN' | 'OVERSEAS' | null,
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      assets: [],
      isUserLoading: false,
      isAssetsLoading: false,
      error: null,

      hydrate: (settings) => set((state) => ({ ...state, ...settings })),
      setBaseCurrency: (currency) => set({ baseCurrency: currency }),
      setLocale: (locale) => set({ locale }),
      setSetupComplete: (complete) => set({ setupComplete: complete }),
      setRegion: (region) => set({ region }),
      reset: () => set({ ...defaultState, assets: [], error: null }),

      fetchUserSettings: async () => {
        if (get().isUserLoading) return
        set({ isUserLoading: true, error: null })
        try {
          const settings = await getUserSettings()
          if (settings) {
            set({
              name: settings.name,
              email: settings.email,
              image: settings.image,
              baseCurrency: settings.baseCurrency || 'CNY',
              locale: settings.locale || 'zh-CN',
              setupComplete: settings.setupComplete,
              region: (settings.region as 'CN' | 'OVERSEAS' | null) || null,
              isUserLoading: false
            })
          } else {
            set({ isUserLoading: false })
          }
        } catch (e) {
          console.error('Failed to fetch user settings:', e)
          if (isDeploymentError(e)) {
            window.location.reload()
            return
          }
          set({ isUserLoading: false, error: 'Failed to fetch settings' })
        }
      },

      fetchAssets: async () => {
        set({ isAssetsLoading: true, error: null })
        try {
          const assets = await getAssets()
          set({ assets, isAssetsLoading: false })
        } catch (e) {
          console.error('Failed to fetch assets:', e)
          if (isDeploymentError(e)) {
            window.location.reload()
            return
          }
          set({ isAssetsLoading: false, error: 'Failed to fetch assets' })
        }
      }
    }),
    {
      name: 'wert-user-settings',
      partialize: (state) => ({
        baseCurrency: state.baseCurrency,
        locale: state.locale,
        setupComplete: state.setupComplete,
        region: state.region,
        name: state.name,
        email: state.email,
        image: state.image,
        assets: state.assets
      }),
    }
  )
)
