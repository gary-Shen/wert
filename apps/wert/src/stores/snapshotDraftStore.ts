import { create } from 'zustand'
import { AssetSnapshotDraft } from '@/app/actions/snapshot'

type SnapshotStep = 'IDLE' | 'LOADING' | 'REVIEW' | 'SAVING'

interface SnapshotDraftState {
  // Draft data
  drafts: AssetSnapshotDraft[]
  date: string
  note: string
  step: SnapshotStep

  // Actions
  setDrafts: (drafts: AssetSnapshotDraft[]) => void
  setDate: (date: string) => void
  setNote: (note: string) => void
  setStep: (step: SnapshotStep) => void

  // Update single draft
  updateDraft: (assetId: string, updates: Partial<AssetSnapshotDraft>) => void
  updateDraftValue: (assetId: string, value: number) => void
  updateDraftQuantity: (assetId: string, quantity: number) => void
  updateDraftPrice: (assetId: string, price: number) => void

  // Computed
  getTotalNetWorth: () => number

  // Reset
  reset: () => void
}

const getDefaultDate = () => new Date().toISOString().split('T')[0]

export const useSnapshotDraftStore = create<SnapshotDraftState>((set, get) => ({
  // Initial state
  drafts: [],
  date: getDefaultDate(),
  note: '',
  step: 'IDLE',

  // Setters
  setDrafts: (drafts) => set({ drafts }),
  setDate: (date) => set({ date }),
  setNote: (note) => set({ note }),
  setStep: (step) => set({ step }),

  // Update single draft
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
        if (d.assetId !== assetId) return d
        const price = d.price || 0
        return { ...d, quantity, currentValue: quantity * price, isDirty: true }
      }),
    })),

  updateDraftPrice: (assetId, price) =>
    set((state) => ({
      drafts: state.drafts.map((d) => {
        if (d.assetId !== assetId) return d
        const qty = d.quantity || 0
        return { ...d, price, currentValue: qty * price, isDirty: true }
      }),
    })),

  // Computed total net worth
  getTotalNetWorth: () => {
    const { drafts } = get()
    return drafts.reduce((sum, item) => {
      const valConverted = item.currentValue * (item.exchangeRate || 1)
      return item.type === 'LIABILITY' ? sum - valConverted : sum + valConverted
    }, 0)
  },

  // Reset to initial state
  reset: () =>
    set({
      drafts: [],
      date: getDefaultDate(),
      note: '',
      step: 'IDLE',
    }),
}))
