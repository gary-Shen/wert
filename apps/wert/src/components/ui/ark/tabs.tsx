'use client'

import * as React from 'react'
import { Tabs as ArkTabs, useTabsContext } from '@ark-ui/react'
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
      "inline-flex h-10 items-center justify-center rounded-full bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof ArkTabs.Trigger>,
  ArkTabs.TriggerProps
>(({ className, children, value, ...props }, ref) => {
  const { value: selectedValue } = useTabsContext()
  const isSelected = selectedValue === value

  return (
    <ArkTabs.Trigger
      value={value}
      asChild
      {...props}
    >
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          "data-[state=active]:text-foreground z-0",
          className
        )}
        whileHover={{ scale: 1.5 }}
        whileTap={{ scale: 0.7 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {isSelected && (
          <motion.span
            layoutId="bubble"
            className="absolute inset-0 z-[-1] rounded-full bg-background shadow-sm"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        {children}
      </motion.button>
    </ArkTabs.Trigger>
  )
})
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
