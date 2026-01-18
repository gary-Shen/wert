"use client"

import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

import { ChartData } from './types'
import { getCategoryLabel } from './constants'

// Generate HSL base colors for categories
const COLORS = [
  { h: 211, s: 100, l: 50 }, // Blue #0088FE
  { h: 167, s: 72, l: 39 },  // Teal #00C49F (approx)
  { h: 42, s: 100, l: 58 },  // Yellow #FFBB28
  { h: 22, s: 100, l: 63 },  // Orange #FF8042
  { h: 271, s: 91, l: 65 },  // Purple #a855f7
  { h: 330, s: 81, l: 60 },  // Pink #ec4899
  { h: 244, s: 84, l: 67 },  // Indigo #6366f1
  { h: 175, s: 80, l: 40 },  // Cyan #14b8a6
  { h: 345, s: 90, l: 60 },  // Rose #f43f5e
  { h: 262, s: 90, l: 66 },  // Violet #8b5cf6
]

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
          const c = COLORS[index % COLORS.length];
          const color = `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
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
    <div className="w-full h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {/* Inner Pie: Categories */}
          <Pie
            data={categoryData}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={55}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {categoryData.map((entry, index) => {
              const c = COLORS[index % COLORS.length];
              return <Cell key={`cell-cat-${index}`} fill={`hsl(${c.h}, ${c.s}%, ${c.l}%)`} opacity={0.6} />;
            })}
          </Pie>

          {/* Outer Pie: Assets */}
          <Pie
            data={assetData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            label={({ name, payload }: { name?: string | number, payload?: ChartData }) => {
              if (payload?.isGroup) {
                return `其他 (${payload.originalAssets?.length || 0})`;
              }
              return name;
            }}
            labelLine={true}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {assetData.map((entry, index) => {
              const catIndex = categoryData.findIndex(c => c.name === (entry.category || 'Other'));
              const baseColor = COLORS[catIndex % COLORS.length];

              const assetsInCat = assetData.filter(a => (a.category || 'Other') === (entry.category || 'Other'));

              // Find index logic specifically for groups
              // If it's a group, make it lighter/distinct

              // Re-find based on name
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
                    <div className="bg-card text-card-foreground p-2 border rounded shadow-sm text-xs max-w-[200px]">
                      <div className="font-bold mb-1 border-b pb-1">{getCategoryLabel(data.category)} - 其他</div>
                      <div className="max-h-[150px] overflow-y-auto">
                        {data.originalAssets.map((a: any, i: number) => (
                          <div key={i} className="flex justify-between gap-4 py-0.5">
                            <span className="truncate max-w-[100px]">{a.name}</span>
                            <span>{a.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t mt-1 pt-1 font-mono text-right font-bold text-muted-foreground">
                        总计: {data.value.toLocaleString()}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="bg-card text-card-foreground p-2 border rounded shadow-sm text-xs">
                    <div className="font-bold">{getCategoryLabel(data.name)}</div>
                    <div>{data.category ? `${getCategoryLabel(data.category)} - ` : ''}{data.value.toLocaleString()}</div>
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
