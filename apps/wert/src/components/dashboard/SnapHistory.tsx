import React, { useState } from 'react'
import { DashboardData, SnapshotHistoryItem } from './types'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { getSnapshotDetails } from '@/app/actions/snapshot'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SnapshotEditModal } from '@/components/snapshot/SnapshotEditModal'

import { SnapOverview } from './SnapOverview'

export function SnapHistory({ data, onRefresh }: { data: DashboardData; onRefresh?: () => void }) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotHistoryItem | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);

  const handleSnapshotClick = async (snap: SnapshotHistoryItem) => {
    setSelectedSnapshot(snap);
    setLoading(true);
    setDetails(null);
    try {
      const res = await getSnapshotDetails(snap.id);
      setDetails(res);
    } catch (e) {
      console.error("Failed to fetch details", e);
    } finally {
      setLoading(false);
    }
  };

  // Transform details to DashboardData for SnapOverview
  const overviewData: DashboardData | null = details ? {
    netWorth: details.snapshot.totalNetWorth,
    assets: details.snapshot.totalAssets,
    liabilities: details.snapshot.totalLiabilities,
    currency: data.currency, // Use global currency or from snapshot if available
    trend: [], // Not used in Overview
    snapshots: [], // Not used in Overview
    pieChartData: details.items.map((item: any) => ({
      name: item.assetName,
      value: item.valuation,
      category: item.assetCategory,
    })),
    // Re-calculate percentages or other derived data if SnapOverview needs it? 
    // SnapOverview calculates percentages itself from pieChartData.
  } : null;

  return (
    <>
      <div className="max-w-md mx-auto min-h-full w-full flex flex-col items-center justify-start py-6 px-4 gap-6 font-sans">

        {/* Chart Card */}
        <div className="w-full">
          <h2 className="text-xl font-bold text-slate-900 mb-4">历史趋势</h2>
          <div className="w-full h-64 bg-white rounded-3xl p-4 shadow-[0_6px_0_-2px_#C8CCD2] border border-slate-100 relative overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  tickFormatter={(val) => val.slice(5)} // Show MM-DD
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2 rounded-lg shadow-xl border border-slate-700">
                          <div className="font-medium text-slate-400 mb-1">{label}</div>
                          <div className="font-bold text-lg">
                            {Number(payload[0].value).toLocaleString()}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4ade80"
                  strokeWidth={4}
                  strokeLinecap="round"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  activeDot={{ r: 6, fill: "#4ade80", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* History List */}
        <div className="w-full">
          <h3 className="text-xl font-bold text-slate-900 mb-4">记录明细</h3>
          <div className="space-y-3">
            {data.snapshots.map(snap => (
              <div
                key={snap.id}
                className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-[0_4px_0_-2px_#C8CCD2] border border-slate-100 cursor-pointer active:scale-[0.98] transition-transform group"
                onClick={() => handleSnapshotClick(snap)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-900">{snap.date}</span>
                  <span className="text-xs text-slate-400 font-medium line-clamp-1">{snap.note || "无备注"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-slate-900 text-lg">
                    {snap.totalNetWorthCny.toLocaleString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSnapshotId(snap.id);
                    }}
                  >
                    <Pencil className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            ))}
            {data.snapshots.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                暂无历史记录
              </div>
            )}
          </div>
        </div>

      </div>

      <Dialog open={!!selectedSnapshot} onOpenChange={(o) => !o && setSelectedSnapshot(null)}>
        <DialogContent className="max-w-md w-full mx-auto rounded-[2rem] p-0 overflow-y-auto max-h-[90vh] bg-slate-50 border-0">
          {loading ? (
            <div className="flex justify-center items-center py-20 h-full">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : overviewData ? (
            <div className="relative">
              <div className="absolute top-4 left-0 w-full text-center pointer-events-none z-10">
                <div className="inline-block bg-slate-900/80 backdrop-blur text-white text-[10px] px-3 py-1 rounded-full font-medium">
                  {selectedSnapshot?.date} 快照
                </div>
              </div>
              <SnapOverview data={overviewData} className="pb-0" />
              {selectedSnapshot?.note && (
                <div className="px-6 pb-8 text-center">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-sm text-slate-500">
                    <span className="font-bold text-slate-900 block mb-1">备注</span>
                    {selectedSnapshot.note}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              无法加载详情
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Snapshot Edit Modal */}
      <SnapshotEditModal
        snapshotId={editingSnapshotId}
        open={!!editingSnapshotId}
        onOpenChange={(open) => !open && setEditingSnapshotId(null)}
        onSuccess={() => {
          setEditingSnapshotId(null);
          onRefresh?.();
        }}
      />
    </>
  )
}

