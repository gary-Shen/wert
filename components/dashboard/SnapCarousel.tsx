'use client'

import React, { useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { SnapPieChart } from './SnapPieChart'

import { DashboardData } from './types'

export function SnapCarousel({ data }: { data: DashboardData }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: 1 }) // Start in Center

  return (
    <div className="h-[90vh] w-full relative bg-background text-foreground overflow-hidden flex flex-col">
      {/* Helper Navigation Hints (Desktop) */}
      <div className="hidden md:flex justify-between p-4 absolute top-0 w-full z-10 pointer-events-none">
        <Button variant="ghost" className="pointer-events-auto" onClick={() => emblaApi?.scrollPrev()}>
          <ArrowLeft className="mr-2" /> 历史记录
        </Button>
        <Link href="/settings">
          <Button variant="ghost" className="pointer-events-auto">设置</Button>
        </Link>
        <Button variant="ghost" className="pointer-events-auto" onClick={() => emblaApi?.scrollNext()}>
          对比 <ArrowRight className="ml-2" />
        </Button>
      </div>

      <div className="embla flex-1" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {/* 1. Left Slide: History */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 flex flex-col gap-4 overflow-y-auto">
            <h2 className="text-3xl font-bold mb-4">历史记录</h2>
            <div className="space-y-4">
              {data.snapshots.map(snap => (
                <Card key={snap.id}>
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle>{snap.date}</CardTitle>
                      <span className="font-mono">{snap.totalNetWorthCny.toLocaleString()} CNY</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{snap.note || "无备注"}</div>
                  </CardHeader>
                </Card>
              ))}
              {data.snapshots.length === 0 && <div className="text-muted-foreground">暂无历史记录。</div>}
            </div>
          </div>

          {/* 2. Center Slide: Dashboard */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 flex flex-col items-center justify-center gap-8 overflow-y-auto">
            <div className="text-center space-y-2 mt-8">
              <h3 className="text-muted-foreground uppercase tracking-widest text-sm">总净值</h3>
              <h1 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                {data.netWorth.toLocaleString()} <span className="text-2xl text-muted-foreground align-top">CNY</span>
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-8 w-full max-w-md">
              <div className="text-center p-4 bg-muted/20 rounded-xl border">
                <div className="text-sm text-muted-foreground mb-1">资产</div>
                <div className="text-xl font-bold text-green-500">+{data.assets.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-xl border">
                <div className="text-sm text-muted-foreground mb-1">负债</div>
                <div className="text-xl font-bold text-red-500">{data.liabilities.toLocaleString()}</div>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="w-full h-48 max-w-2xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number | undefined) => (value ?? 0).toLocaleString()}
                  />
                  <Area type="monotone" dataKey="value" name="总净值" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            {data.pieChartData && data.pieChartData.length > 0 && (
              <div className="w-full max-w-2xl">
                <SnapPieChart data={data.pieChartData} />
              </div>
            )}
          </div>

          {/* 3. Right Slide: Comparison */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 flex flex-col gap-4">
            <h2 className="text-3xl font-bold mb-4">分析</h2>
            <div className="text-muted-foreground">
              此处将显示与上月的对比逻辑。
              (MVP+ 版本即将推出)
            </div>
          </div>
        </div>
      </div>

      {/* Bottom FAB Area would be absolute positioned here or in Page */}
    </div>
  )
}
