'use client'

import * as React from 'react'
import { Popover as ArkPopover, Portal } from '@ark-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const Popover = ArkPopover.Root
const PopoverTrigger = ArkPopover.Trigger
const PopoverAnchor = ArkPopover.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof ArkPopover.Content>,
  ArkPopover.ContentProps
>(({ className, ...props }, ref) => (
  <Portal>
    <ArkPopover.Positioner>
      <ArkPopover.Content asChild ref={ref} {...props}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "z-50 w-[90vw] sm:w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            className
          )}
        >
          {props.children}
        </motion.div>
      </ArkPopover.Content>
    </ArkPopover.Positioner>
  </Portal>
))
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
