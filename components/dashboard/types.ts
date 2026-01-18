
export interface ChartData {
  name: string
  value: number
  category?: string
  isGroup?: boolean
  originalAssets?: ChartData[]

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
}
