"use client"

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

import { ChartData } from './types'
import { getCategoryLabel } from './constants'
import { getCategoryColor, hslToString } from './colors'

export function SnapPieChart({ data }: { data: ChartData[] }) {
  const { categoryData, assetData } = useMemo(() => {
    // 1. Filter valid data
    const validData = data.filter(d => d.value > 0);
    const totalValue = validData.reduce((acc, cur) => acc + cur.value, 0);
    const GROUP_THRESHOLD = 0.03; // 3%

    // 2. Aggregate by Category
    const categoryMap = new Map<string, number>();
    validData.forEach(d => {
      const cat = d.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + d.value);
    });

    const categoryDataUnsorted = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
    categoryDataUnsorted.sort((a, b) => b.value - a.value);

    // 3. Process Assets with Grouping
    const finalAssetData: ChartData[] = [];
    const smallAssets: ChartData[] = [];

    categoryDataUnsorted.forEach(cat => {
      const assetsInCat = validData.filter(d => (d.category || 'Other') === cat.name);
      assetsInCat.sort((a, b) => b.value - a.value);

      const majorAssets = assetsInCat.filter(d => (d.value / totalValue) >= GROUP_THRESHOLD);
      const minorAssets = assetsInCat.filter(d => (d.value / totalValue) < GROUP_THRESHOLD);

      if (majorAssets.length > 0) {
        finalAssetData.push(...majorAssets);
      }

      if (minorAssets.length > 0) {
        const minorTotal = minorAssets.reduce((sum, a) => sum + a.value, 0);
        smallAssets.push(...minorAssets);

        finalAssetData.push({
          name: '其他',
          value: minorTotal,
          category: cat.name,
          isGroup: true,
          originalAssets: minorAssets
        });
      }
    });

    return {
      categoryData: categoryDataUnsorted,
      assetData: finalAssetData,
      groupedItems: smallAssets
    };
  }, [data])

  if (assetData.length === 0) {
    return <div className="text-muted-foreground text-sm">暂无资产数据可显示</div>
  }

  const renderLegend = () => {
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs mt-4">
        {categoryData.map((entry, index) => {
          const color = hslToString(getCategoryColor(entry.name));
          return (
            <div key={`legend-${index}`} className="flex items-center">
              <span
                className="w-3 h-3 mr-1 inline-block rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{getCategoryLabel(entry.name)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {/* Inner Pie: Categories */}
          <Pie
            data={categoryData}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={50}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            paddingAngle={2}
            cornerRadius={5}
          >
            {categoryData.map((entry, index) => {
              const color = hslToString(getCategoryColor(entry.name));
              return <Cell key={`cell-cat-${index}`} fill={color} opacity={0.6} />;
            })}
          </Pie>

          {/* Outer Pie: Assets */}
          <Pie
            data={assetData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            paddingAngle={2}
            cornerRadius={5}
          >
            {assetData.map((entry, index) => {
              const baseColor = getCategoryColor(entry.category || 'Other');

              const assetsInCat = assetData.filter(a => (a.category || 'Other') === (entry.category || 'Other'));
              const idxInCat = assetsInCat.findIndex(a => a.name === entry.name);

              const lightnessStep = 7;
              const newLightness = Math.min(92, baseColor.l + (idxInCat * lightnessStep));

              const color = `hsl(${baseColor.h}, ${baseColor.s}%, ${newLightness}%)`;
              return <Cell key={`cell-asset-${index}`} fill={color} />;
            })}
          </Pie>

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                if (data.isGroup) {
                  return (
                    <div className="bg-popover text-popover-foreground p-3 border border-border rounded-xl shadow-lg text-xs max-w-[200px]">
                      <div className="font-bold mb-2 border-b border-border pb-2 text-muted-foreground">{data.category ? `${getCategoryLabel(data.category)}` : ''}</div>
                      <div className="max-h-[150px] overflow-y-auto space-y-1">
                        {data.originalAssets.map((a: any, i: number) => (
                          <div key={i} className="flex justify-between gap-4">
                            <span className="truncate max-w-[100px] text-muted-foreground">{a.name}</span>
                            <span className="font-mono">{a.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border mt-2 pt-2 font-mono text-right font-bold">
                        总计: {data.value.toLocaleString()}
                      </div>
                    </div>
                  );
                }

                const pct = data.changePercentage || 0;
                const isPositive = pct > 0;
                const isZero = pct === 0;

                return (
                  <div className="flex flex-col gap-1 bg-popover text-popover-foreground p-3 border border-border shadow-lg rounded-xl min-w-[200px]">
                    <div className="text-sm font-medium text-muted-foreground">{getCategoryLabel(data.name)}</div>
                    <div className="text-xl font-bold tracking-tight">
                      {data.value.toLocaleString()}
                    </div>
                    {!isZero && (
                      <div className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{pct.toFixed(2)}% <span className="text-muted-foreground font-normal">Change</span>
                      </div>
                    )}
                  </div>
                )
              }
              return null;
            }}
          />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
