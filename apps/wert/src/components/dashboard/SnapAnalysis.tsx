import React from 'react'
import { DashboardData } from './types'
import { getCategoryColor, hslToString } from './colors'
import { getCategoryIcon } from './icons'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export function SnapAnalysis({ data }: { data: DashboardData }) {
  if (!data.assetChanges || data.assetChanges.length === 0) {
    return (
      <div className="flex flex-col gap-4 h-full items-center justify-center text-slate-400 p-8 text-center font-sans">
        <p className="font-medium">需要至少两个历史快照才能进行对比分析</p>
        <p className="text-sm opacity-70">请稍后继续记录一次快照</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-full w-full flex flex-col items-center justify-start py-6 px-4 gap-6 font-sans">
      <div className="w-full">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-baseline gap-2">
          资产变动分析
          <span className="text-xs font-normal text-slate-500">(较上期)</span>
        </h2>

        <div className="space-y-3">
          {data.assetChanges.map(item => {

            const changeVal = item.changeValue;
            const isZero = changeVal === 0;
            const isPositive = changeVal > 0;

            const isLiability = item.category === 'LIABILITY';

            // Logic: 
            // Liability: Increase = Bad (Red), Decrease = Good (Emerald)
            // Asset: Increase = Good (Emerald), Decrease = Bad (Red)
            let colorClass = "text-slate-500";
            if (!isZero) {
              if (isLiability) {
                colorClass = isPositive ? "text-red-500" : "text-emerald-500";
              } else {
                colorClass = isPositive ? "text-emerald-500" : "text-red-500";
              }
            }

            const category = item.category || 'OTHER';
            const CategoryIcon = getCategoryIcon(category);
            const baseColor = getCategoryColor(category);
            const colorStr = hslToString(baseColor);

            // Light background version of the color (opacity 15%)
            const bgStyle = { backgroundColor: `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%, 0.15)` };
            const iconStyle = { color: colorStr };

            return (
              <div key={item.assetId} className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-[0_4px_0_-2px_#C8CCD2] border border-slate-100">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center min-w-[2.5rem]" style={bgStyle}>
                    <CategoryIcon className="w-5 h-5" style={iconStyle} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate max-w-[100px] sm:max-w-[140px]">{item.name}</span>
                      {item.isNew && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                          NEW
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
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
                  {isZero && <div className="text-xs text-slate-400 font-mono">0.0%</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
