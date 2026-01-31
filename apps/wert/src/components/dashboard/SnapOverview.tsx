import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { DashboardData } from './types'
import { SnapPieChart } from './SnapPieChart'
import { Landmark, Bean, Coins, Building2, Car, Gem, Stamp, CreditCard, ArrowDownNarrowWide, ArrowDownWideNarrow, Eye, EyeOff } from 'lucide-react'
import { getCategoryColor, hslToString } from './colors'

// Map categories to icons
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CASH': return Coins;
    case 'STOCK':
    case 'FUND': return Landmark;
    case 'REAL_ESTATE': return Building2;
    case 'VEHICLE': return Car;
    case 'PRECIOUS_METAL': return Gem;
    case 'COLLECTIBLE': return Stamp;
    case 'LIABILITY': return CreditCard;
    default: return Bean;
  }
}

export function SnapOverview({ data, className }: { data: DashboardData; className?: string }) {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAmount, setShowAmount] = useState(true);

  const netWorth = data.netWorth.toFixed(0);
  const assetsVal = data.assets;
  const liabilitiesVal = Math.abs(data.liabilities);
  const totalVolume = assetsVal + liabilitiesVal;

  // Progress bar percentage (Assets / (Assets + Liabilities))
  // If no liabilities, 100% full.
  const progressPercent = totalVolume > 0 ? (assetsVal / totalVolume) * 100 : 0;

  // Pie Chart Data Preparation
  const sortedAssets = [...(data.pieChartData || [])].sort((a, b) => {
    return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
  });

  // Calculate total for percentages
  // Note: Total should be sum of ALL assets, regardless of sort order.
  const totalPieValue = (data.pieChartData || []).reduce((sum, item) => sum + item.value, 0);

  const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  const togglePrivacy = () => setShowAmount(prev => !prev);

  const displayValue = (val: string | number) => {
    if (!showAmount) return '****';
    return val.toLocaleString();
  };

  return (
    <div className={cn("max-w-md mx-auto min-h-full w-full flex flex-col items-center justify-start py-6 px-4 gap-6 font-sans", className)}>

      {/* Net Worth Card */}
      <div className="w-full bg-primary rounded-3xl p-6 text-primary-foreground shadow-lg relative overflow-hidden">
        {/* Background Gradient/Effect could go here */}

        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium opacity-70 uppercase tracking-wide">净资产 ({data.currency})</h3>
            <button
              onClick={togglePrivacy}
              className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary-foreground/50"
              title={showAmount ? "Hide Amounts" : "Show Amounts"}
            >
              {showAmount ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight">{displayValue(Number(netWorth))}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-primary-foreground/20 rounded-full mb-2 overflow-hidden flex">
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Liabilities space is effectively the empty space or we could make it red explicit */}
        </div>

        {/* Assets / Liabilities Row */}
        <div className="flex justify-between items-center text-sm">
          <div>
            <div className="text-xs opacity-70 mb-0.5">资产</div>
            <div className="text-emerald-400 font-medium">{showAmount ? `+${assetsVal.toLocaleString()}` : '****'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-70 mb-0.5">负债</div>
            <div className="text-red-400 font-medium">{showAmount ? `-${liabilitiesVal.toLocaleString()}` : '****'}</div>
          </div>
        </div>
      </div>

      {/* Allocation Section */}
      <div className="w-full">
        <h2 className="text-lg font-bold text-foreground mb-4">资产配置</h2>

        {/* Chart */}
        <div className="w-full mb-6 flex justify-center">
          <SnapPieChart data={data.pieChartData || []} />
        </div>

        {/* Asset List */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-bold text-foreground">资产明细</h3>
          <button
            onClick={toggleSort}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={sortOrder === 'desc' ? "Switch to Low-to-High" : "Switch to High-to-Low"}
          >
            {sortOrder === 'desc' ? <ArrowDownWideNarrow size={18} /> : <ArrowDownNarrowWide size={18} />}
          </button>
        </div>
        <div className="space-y-3">
          {sortedAssets.map((item) => {
            const percent = totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(2) : "0";

            const category = item.category || 'OTHER';
            const CategoryIcon = getCategoryIcon(category);
            const baseColor = getCategoryColor(category);
            const colorStr = hslToString(baseColor);

            // Light background version of the color (opacity 15%)
            const bgStyle = { backgroundColor: `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%, 0.15)` };
            const iconStyle = { color: colorStr };

            return (
              <div key={item.name} className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={bgStyle}>
                    {/* Icon */}
                    <CategoryIcon className="w-5 h-5" style={iconStyle} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground font-medium">占比 {percent}%</span>
                  </div>
                </div>

                <div className="font-bold text-foreground">
                  {/* Use 'compact' notation if possible or just LocaleString */}
                  {showAmount ? Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(item.value) : '****'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  )
}
