/**
 * Auto-valuation configuration types
 * Used for automatic calculation of asset values (depreciation, amortization)
 */

export interface DepreciatingAssetConfig {
  type: 'depreciation'
  purchasePrice: number
  purchaseDate: string // YYYY-MM-DD
  lifespanMonths: number
  salvageValue?: number // Residual value at end of life
}

export interface LiabilityConfig {
  type: 'amortization'
  initialLoan: number
  monthlyPayment: number
  repaymentDate: string // YYYY-MM-DD - start date of repayment
  paymentDay?: number // Day of month for payment (1-28)
}

export type AutoConfig = DepreciatingAssetConfig | LiabilityConfig

export function isDepreciatingConfig(config: any): config is DepreciatingAssetConfig {
  return config?.type === 'depreciation' || config?.purchasePrice !== undefined
}

export function isLiabilityConfig(config: any): config is LiabilityConfig {
  return config?.type === 'amortization' || config?.initialLoan !== undefined
}

// Categories that support auto-config
export const DEPRECIATION_CATEGORIES = ['REAL_ESTATE', 'VEHICLE'] as const
export const AMORTIZATION_CATEGORIES = ['LIABILITY'] as const

export function supportsAutoConfig(category: string): boolean {
  return (
    DEPRECIATION_CATEGORIES.includes(category as any) ||
    AMORTIZATION_CATEGORIES.includes(category as any)
  )
}

export function getAutoConfigType(category: string): 'depreciation' | 'amortization' | null {
  if (DEPRECIATION_CATEGORIES.includes(category as any)) {
    return 'depreciation'
  }
  if (AMORTIZATION_CATEGORIES.includes(category as any)) {
    return 'amortization'
  }
  return null
}

// Default lifespan values (in months)
export const DEFAULT_LIFESPAN: Record<string, number> = {
  REAL_ESTATE: 600, // 50 years
  VEHICLE: 120, // 10 years
}

export function getDefaultLifespan(category: string): number {
  return DEFAULT_LIFESPAN[category] || 120
}
