'use client'

import { useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { DashboardData } from './types'
import { SnapHistory } from './SnapHistory'
import { SnapOverview } from './SnapOverview'
import { SnapAnalysis } from './SnapAnalysis'
import { PullToSettings } from '@/components/settings/PullToSettings'
import { SettingsSheet } from '@/components/settings/SettingsSheet'

export function SnapCarousel({ data }: { data: DashboardData }) {
  const [emblaRef] = useEmblaCarousel({ loop: false, startIndex: 1 })
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <PullToSettings onTrigger={() => setSettingsOpen(true)}>
        <div className="h-full w-full relative bg-background text-foreground overflow-hidden flex flex-col">
          <div className="embla flex-1 overflow-hidden" ref={emblaRef}>
            <div className="embla__container flex h-full">
              {/* 1. Left Slide: History */}
              <div id="snapHistory" className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 overflow-y-auto h-full" data-scroll-container>
                <SnapHistory data={data} />
              </div>

              {/* 2. Center Slide: Dashboard */}
              <div id="snapOverview" className="embla__slide flex-[0_0_100%] min-w-0 overflow-y-auto h-full" data-scroll-container>
                <SnapOverview data={data} />
              </div>

              {/* 3. Right Slide: Analysis */}
              <div id="snapAnalysis" className="embla__slide flex-[0_0_100%] min-w-0 p-4 md:p-8 overflow-y-auto h-full" data-scroll-container>
                <SnapAnalysis data={data} />
              </div>
            </div>
          </div>
        </div>
      </PullToSettings>

      {/* Full screen settings sheet for mobile */}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
