import type { AssetCategory } from "@/db/schema";

/**
 * 图表数据类型
 */
export interface ChartData {
  name: string;
  value: number;
  category?: AssetCategory;
  isGroup?: boolean;
  originalAssets?: ChartData[];
  changePercentage?: number;
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  date: string;
  value: number;
}

/**
 * 历史快照项
 */
export interface SnapshotHistoryItem {
  id: string;
  date: string;
  totalNetWorth: number;
  note?: string | null;
  createdAt: Date | null;
}

/**
 * Dashboard 主数据
 */
export interface DashboardData {
  netWorth: number;
  assets: number;
  liabilities: number;
  trend: TrendDataPoint[];
  snapshots: SnapshotHistoryItem[];
  pieChartData?: ChartData[];
  currency: string;
  assetChanges?: AssetChange[];
}

/**
 * 资产变化
 */
export interface AssetChange {
  assetId: string;
  name: string;
  category: AssetCategory;
  previousValue: number;
  currentValue: number;
  changeValue: number;
  changePercentage: number;
  isNew: boolean;
  isRemoved?: boolean;
}
