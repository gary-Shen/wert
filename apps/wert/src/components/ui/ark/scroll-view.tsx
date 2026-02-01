'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ScrollViewProps extends React.HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string
}

/**
 * A simple ScrollView component that replaces Radix ScrollArea.
 * Uses native scrolling with custom scrollbar styling via Tailwind classes.
 */
const ScrollView = React.forwardRef<HTMLDivElement, ScrollViewProps>(
  ({ className, children, viewportClassName, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <div className={cn("h-full w-full overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-1", viewportClassName)}>
        {children}
      </div>
    </div>
  )
)
ScrollView.displayName = "ScrollView"

export { ScrollView }
