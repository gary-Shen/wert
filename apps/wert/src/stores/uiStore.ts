import { create } from 'zustand'

interface UIState {
  // Modal states
  settingsModalOpen: boolean
  snapWizardOpen: boolean
  currencySetupOpen: boolean
  snapshotEditId: string | null
  assetEditId: string | null

  // Actions
  openSettingsModal: () => void
  closeSettingsModal: () => void
  toggleSettingsModal: () => void

  openSnapWizard: () => void
  closeSnapWizard: () => void
  toggleSnapWizard: () => void

  openCurrencySetup: () => void
  closeCurrencySetup: () => void

  openSnapshotEdit: (snapshotId: string) => void
  closeSnapshotEdit: () => void

  openAssetEdit: (assetId: string) => void
  closeAssetEdit: () => void

  // Reset all modals
  closeAllModals: () => void
}

export const useUIStore = create<UIState>((set) => ({
  // Initial states
  settingsModalOpen: false,
  snapWizardOpen: false,
  currencySetupOpen: false,
  snapshotEditId: null,
  assetEditId: null,

  // Settings Modal
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
  toggleSettingsModal: () => set((state) => ({ settingsModalOpen: !state.settingsModalOpen })),

  // Snap Wizard
  openSnapWizard: () => set({ snapWizardOpen: true }),
  closeSnapWizard: () => set({ snapWizardOpen: false }),
  toggleSnapWizard: () => set((state) => ({ snapWizardOpen: !state.snapWizardOpen })),

  // Currency Setup
  openCurrencySetup: () => set({ currencySetupOpen: true }),
  closeCurrencySetup: () => set({ currencySetupOpen: false }),

  // Snapshot Edit
  openSnapshotEdit: (snapshotId) => set({ snapshotEditId: snapshotId }),
  closeSnapshotEdit: () => set({ snapshotEditId: null }),

  // Asset Edit
  openAssetEdit: (assetId) => set({ assetEditId: assetId }),
  closeAssetEdit: () => set({ assetEditId: null }),

  // Close all
  closeAllModals: () => set({
    settingsModalOpen: false,
    snapWizardOpen: false,
    currencySetupOpen: false,
    snapshotEditId: null,
    assetEditId: null,
  }),
}))
