'use client'

import React, { useEffect, useState } from 'react'
import { DashboardData, AssetChange } from './types'
import { getCategoryColor, hslToString } from './colors'
import { getCategoryIcon } from './icons'
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react'
import { SnapshotCompareSelector } from './SnapshotCompareSelector'
import { getComparisonData } from '@/app/actions/snapshot'

// Category name mapping
const CATEGORY_NAMES: Record<string, string> = {
  CASH: '现金',
  STOCK: '股票',
  FUND: '基金',
  BOND: '债券',
  CRYPTO: '加密货币',
  REAL_ESTATE: '房产',
  VEHICLE: '交通工具',
  PRECIOUS_METAL: '贵金属',
  COLLECTIBLE: '收藏品',
  LIABILITY: '负债',
}

interface CategorySummary {
  category: string
  name: string
  currentTotal: number
  previousTotal: number
  changeValue: number
  changePercentage: number
}

function calculateCategorySummary(changes: AssetChange[]): CategorySummary[] {
  const categoryMap = new Map<string, { current: number; previous: number }>()

  for (const change of changes) {
    const existing = categoryMap.get(change.category) || { current: 0, previous: 0 }
    existing.current += change.currentValue
    existing.previous += change.previousValue
    categoryMap.set(change.category, existing)
  }

  const summaries: CategorySummary[] = []
  for (const [category, values] of categoryMap) {
    const changeValue = values.current - values.previous
    const changePercentage = values.previous !== 0
      ? (changeValue / values.previous) * 100
      : values.current !== 0 ? 100 : 0

    summaries.push({
      category,
      name: CATEGORY_NAMES[category] || category,
      currentTotal: values.current,
      previousTotal: values.previous,
      changeValue,
      changePercentage,
    })
  }

  return summaries.sort((a, b) => Math.abs(b.changeValue) - Math.abs(a.changeValue))
}

export function SnapAnalysis({ data }: { data: DashboardData }) {
  const [assetChanges, setAssetChanges] = useState<AssetChange[]>(data.assetChanges || [])
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null)
  const [showCategorySummary, setShowCategorySummary] = useState(true)
  const [loading, setLoading] = useState(false)

  // Get current snapshot ID (latest)
  const currentSnapshotId = data.snapshots[0]?.id
  // Default compare to previous snapshot
  const defaultCompareId = data.snapshots[1]?.id

  useEffect(() => {
    if (defaultCompareId && !selectedCompareId) {
      setSelectedCompareId(defaultCompareId)
    }
  }, [defaultCompareId, selectedCompareId])

  const handleCompareSelect = async (snapshotId: string) => {
    if (!currentSnapshotId) return

    setLoading(true)
    setSelectedCompareId(snapshotId)

    try {
      const newChanges = await getComparisonData(currentSnapshotId, snapshotId)
      setAssetChanges(newChanges)
    } catch (error) {
      console.error('Failed to fetch comparison data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!assetChanges || assetChanges.length === 0) {
    return (
      <div className="flex flex-col gap-4 h-full items-center justify-center text-muted-foreground p-8 text-center font-sans">
        <p className="font-medium">需要至少两个历史快照才能进行对比分析</p>
        <p className="text-sm opacity-70">请稍后继续记录一次快照</p>
      </div>
    )
  }

  const categorySummary = calculateCategorySummary(assetChanges)
  const totalChange = assetChanges.reduce((sum, item) => {
    return item.category === 'LIABILITY'
      ? sum + item.changeValue // Liability reduction is good
      : sum + item.changeValue
  }, 0)

  // Calculate net worth change considering liability sign
  const netWorthChange = assetChanges.reduce((sum, item) => {
    if (item.category === 'LIABILITY') {
      return sum - item.changeValue // Liability increase reduces net worth
    }
    return sum + item.changeValue
  }, 0)

  const selectedCompareSnapshot = data.snapshots.find(s => s.id === selectedCompareId)

  return (
    <div className="max-w-md mx-auto min-h-full w-full flex flex-col items-center justify-start py-6 px-4 gap-6 font-sans">
      <div className="w-full">
        {/* Header with Compare Selector */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            资产变动分析
          </h2>
          {currentSnapshotId && data.snapshots.length > 1 && (
            <SnapshotCompareSelector
              currentSnapshotId={currentSnapshotId}
              selectedSnapshotId={selectedCompareId}
              onSelect={handleCompareSelect}
              className="w-40 h-8 text-xs"
            />
          )}
        </div>

        {/* Compare Info */}
        {selectedCompareSnapshot && (
          <div className="text-xs text-muted-foreground mb-4">
            对比: {selectedCompareSnapshot.date} 快照
          </div>
        )}

        {/* Net Worth Change Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 mb-4">
          <div className="text-sm text-muted-foreground mb-1">净值变化</div>
          <div className={`text-2xl font-bold ${netWorthChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {netWorthChange >= 0 ? '+' : ''}{netWorthChange.toLocaleString()}
          </div>
        </div>

        {/* Category Summary */}
        <div className="mb-4">
          <button
            className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 hover:opacity-80"
            onClick={() => setShowCategorySummary(!showCategorySummary)}
          >
            类别汇总
            {showCategorySummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCategorySummary && (
            <div className="bg-muted rounded-xl p-3 space-y-2">
              {categorySummary.map((cat) => {
                const isLiability = cat.category === 'LIABILITY'
                const isPositive = cat.changeValue > 0
                const isZero = cat.changeValue === 0

                // For liability, decrease is good (green)
                let colorClass = 'text-muted-foreground'
                if (!isZero) {
                  if (isLiability) {
                    colorClass = isPositive ? 'text-red-500' : 'text-emerald-500'
                  } else {
                    colorClass = isPositive ? 'text-emerald-500' : 'text-red-500'
                  }
                }

                const CategoryIcon = getCategoryIcon(cat.category)
                const baseColor = getCategoryColor(cat.category)
                const iconStyle = { color: hslToString(baseColor) }

                return (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="w-4 h-4" style={iconStyle} />
                      <span className="text-foreground">{cat.name}</span>
                    </div>
                    <div className={`font-mono font-medium ${colorClass}`}>
                      {isPositive ? '+' : ''}{cat.changeValue.toLocaleString()}
                      {!isZero && (
                        <span className="text-xs ml-1">
                          ({isPositive ? '+' : ''}{cat.changePercentage.toFixed(1)}%)
                        </span>
                      )}
                      {isLiability && !isZero && !isPositive && (
                        <span className="ml-1 text-xs">✓</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Asset Details */}
        <div className="mb-2">
          <h3 className="text-sm font-bold text-foreground mb-3">资产明细</h3>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            assetChanges.map(item => {
              const changeVal = item.changeValue
              const isZero = changeVal === 0
              const isPositive = changeVal > 0
              const isLiability = item.category === 'LIABILITY'

              let colorClass = 'text-muted-foreground'
              if (!isZero) {
                if (isLiability) {
                  colorClass = isPositive ? 'text-red-500' : 'text-emerald-500'
                } else {
                  colorClass = isPositive ? 'text-emerald-500' : 'text-red-500'
                }
              }

              const category = item.category || 'OTHER'
              const CategoryIcon = getCategoryIcon(category)
              const baseColor = getCategoryColor(category)
              const colorStr = hslToString(baseColor)

              const bgStyle = { backgroundColor: `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%, 0.15)` }
              const iconStyle = { color: colorStr }

              return (
                <div key={item.assetId} className="flex justify-between items-center p-4 bg-card rounded-2xl shadow-sm border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center min-w-[2.5rem]" style={bgStyle}>
                      <CategoryIcon className="w-5 h-5" style={iconStyle} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate max-w-[100px] sm:max-w-[140px]">{item.name}</span>
                        {item.isNew && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                            NEW
                          </span>
                        )}
                        {item.isRemoved && (
                          <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold">
                            已移除
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {isZero ? '无变化' : (isPositive ? '增加' : '减少')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className={`font-bold font-mono text-base ${colorClass}`}>
                      {isPositive ? '+' : ''}{changeVal.toLocaleString()}
                    </div>
                    {!isZero && (
                      <div className={`text-xs ${colorClass} flex items-center gap-0.5 opacity-90 font-medium`}>
                        {item.changeValue > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(item.changePercentage).toFixed(1)}%
                      </div>
                    )}
                    {isZero && <div className="text-xs text-muted-foreground font-mono">0.0%</div>}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
