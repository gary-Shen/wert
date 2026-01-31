'use client'

import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { DashboardData } from './types'
import { SnapHistory } from './SnapHistory'
import { SnapOverview } from './SnapOverview'
import { SnapAnalysis } from './SnapAnalysis'

export function SnapCarousel({ data }: { data: DashboardData }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: 1 }) // Start in Center

  return (
    <div className="h-full w-full relative bg-background text-foreground overflow-hidden flex flex-col">
      {/* Helper Navigation Hints (Desktop) */}
      <div className="hidden md:flex justify-between p-4 absolute top-0 w-full z-10 pointer-events-none">
        <Button variant="ghost" className="pointer-events-auto" onClick={() => emblaApi?.scrollPrev()}>
          <ArrowLeft className="mr-2" /> 历史记录
        </Button>
        <Button variant="ghost" className="pointer-events-auto" onClick={() => emblaApi?.scrollNext()}>
          对比 <ArrowRight className="ml-2" />
        </Button>
      </div>

      <div className="embla flex-1 overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {/* 1. Left Slide: History */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 overflow-y-auto h-full">
            <SnapHistory data={data} />
          </div>

          {/* 2. Center Slide: Dashboard */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 overflow-y-auto h-full">
            <div className="min-h-full w-full p-4 md:p-8">
              <SnapOverview data={data} />
            </div>
          </div>

          {/* 3. Right Slide: Analysis */}
          <div className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 overflow-y-auto h-full">
            <SnapAnalysis data={data} />
          </div>
        </div>
      </div>

      {/* Bottom FAB Area would be absolute positioned here or in Page */}
    </div>
  )
}

