'use client'

import * as React from 'react'
import { Popover as ArkPopover, Portal, usePopoverContext } from '@ark-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const Popover = ArkPopover.Root
const PopoverTrigger = ArkPopover.Trigger
const PopoverAnchor = ArkPopover.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof ArkPopover.Content>,
  ArkPopover.ContentProps
>(({ className, ...props }, ref) => {
  const context = usePopoverContext()
  const open = context?.open ?? false

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          />
        )}
      </AnimatePresence>
      <ArkPopover.Positioner>
        <ArkPopover.Content asChild ref={ref} {...props}>
          <motion.div
            initial="closed"
            animate={open ? "open" : "closed"}
            exit="closed"
            variants={{
              open: { opacity: 1, scale: 1 },
              closed: { opacity: 0, scale: 0.5 }
            }}
            transition={{ type: "spring", stiffness: 600, damping: 25 }}
            className={cn(
              "z-50 w-[90vw] sm:w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
              // Base origins per side
              "data-[side=bottom]:origin-top data-[side=top]:origin-bottom data-[side=left]:origin-right data-[side=right]:origin-left",
              // Specific corner origins based on placement
              "data-[placement=top-start]:origin-bottom-left data-[placement=top-end]:origin-bottom-right",
              "data-[placement=bottom-start]:origin-top-left data-[placement=bottom-end]:origin-top-right",
              "data-[placement=left-start]:origin-top-right data-[placement=left-end]:origin-bottom-right",
              "data-[placement=right-start]:origin-top-left data-[placement=right-end]:origin-bottom-left",
              className
            )}
          >
            {props.children}
          </motion.div>
        </ArkPopover.Content>
      </ArkPopover.Positioner>
    </Portal >
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
