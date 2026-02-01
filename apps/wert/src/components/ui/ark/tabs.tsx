'use client'

import * as React from 'react'
import { Tabs as ArkTabs } from '@ark-ui/react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const Tabs = ArkTabs.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof ArkTabs.List>,
  ArkTabs.ListProps
>(({ className, ...props }, ref) => (
  <ArkTabs.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof ArkTabs.Trigger>,
  ArkTabs.TriggerProps
>(({ className, children, value, ...props }, ref) => (
  // We use relative positioning to handle the absolute motion indicator if desired
  <ArkTabs.Trigger
    ref={ref}
    value={value}
    className={cn(
      "relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  >
    {/* Optional: Add animated indicator here if we wanted strictly separate motion div */}
    {children}
  </ArkTabs.Trigger>
))
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof ArkTabs.Content>,
  ArkTabs.ContentProps
>(({ className, ...props }, ref) => (
  <ArkTabs.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
