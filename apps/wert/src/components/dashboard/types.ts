
export interface ChartData {
  name: string
  value: number
  category?: string
  isGroup?: boolean
  originalAssets?: ChartData[]
  changePercentage?: number

  [key: string]: any
}

export interface SnapshotHistoryItem {
  id: string
  date: string
  totalNetWorth: string
  totalNetWorthCny: number
  note?: string | null
  createdAt: Date | null

}

export interface DashboardData {
  netWorth: number
  assets: number
  liabilities: number
  trend: { date: string; value: number }[]
  snapshots: SnapshotHistoryItem[]
  pieChartData?: ChartData[]
  currency: string
  assetChanges?: AssetChange[]
}

export interface AssetChange {
  assetId: string
  name: string
  category: string
  previousValue: number
  currentValue: number
  changeValue: number
  changePercentage: number
  isNew: boolean
  isRemoved?: boolean
}
