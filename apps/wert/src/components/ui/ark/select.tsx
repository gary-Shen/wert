'use client'

import * as React from 'react'
import { Select as ArkSelect, Portal } from '@ark-ui/react'
import { createListCollection } from '@ark-ui/react/select'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Re-export for convenience
export { createListCollection }

interface SelectItem {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value?: string[]
  onValueChange?: (details: { value: string[]; items: SelectItem[] }) => void
  collection: ReturnType<typeof createListCollection<SelectItem>>
  placeholder?: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

interface SelectTriggerProps {
  children?: React.ReactNode
  className?: string
  placeholder?: string
}

interface SelectContentProps {
  children?: React.ReactNode
  className?: string
}

interface SelectItemProps {
  item: SelectItem
  children?: React.ReactNode
  className?: string
}

// Context to share state between components
const SelectContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMobile: boolean
}>({
  isOpen: false,
  setIsOpen: () => { },
  isMobile: false,
})

const Select = ({
  value,
  onValueChange,
  collection,
  disabled,
  children,
}: SelectProps) => {
  const [isMobile, setIsMobile] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, isMobile }}>
      <ArkSelect.Root
        collection={collection}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        open={isOpen}
        onOpenChange={(e) => setIsOpen(e.open)}
        positioning={{ sameWidth: true, placement: 'bottom' }}
      >
        {children}
      </ArkSelect.Root>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <ArkSelect.Control>
      <ArkSelect.Trigger
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "touch-manipulation",
          className
        )}
        {...props}
      >
        {children}
        <ArkSelect.Indicator>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </ArkSelect.Indicator>
      </ArkSelect.Trigger>
    </ArkSelect.Control>
  )
)
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <ArkSelect.ValueText placeholder={placeholder} />
)

const SelectContent = ({ children, className }: SelectContentProps) => {
  const { isMobile, setIsOpen, isOpen } = React.useContext(SelectContext)

  if (isMobile) {
    // Mobile: Bottom Sheet Style
    return (
      <Portal>
        <AnimatePresence>
          <ArkSelect.Positioner className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            {/* Bottom Sheet */}
            <ArkSelect.Content asChild>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  "absolute bottom-0 left-0 right-0 z-[9999]",
                  "max-h-[70vh] overflow-hidden rounded-t-3xl",
                  "bg-background shadow-xl",
                  className
                )}
              >
                {/* Drag Handle */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-3 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* Options List */}
                <div className="overflow-y-auto max-h-[calc(70vh-60px)] px-2 pb-safe-area-inset-bottom">
                  {children}
                </div>
              </motion.div>
            </ArkSelect.Content>
          </ArkSelect.Positioner>
        </AnimatePresence>
      </Portal>
    )
  }

  // Desktop: Standard Dropdown
  return (
    <Portal>
      <ArkSelect.Positioner className="z-[500]">
        <AnimatePresence>
          {isOpen && (
            <ArkSelect.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "min-w-[8rem] overflow-hidden rounded-md border",
                  "bg-popover text-popover-foreground shadow-md",
                  className
                )}
              >
                <div className="p-1">
                  {children}
                </div>
              </motion.div>
            </ArkSelect.Content>
          )}
        </AnimatePresence>
      </ArkSelect.Positioner>
    </Portal>
  )
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ item, children, className, ...props }, ref) => (
    <ArkSelect.Item
      ref={ref}
      item={item}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center",
        "rounded-md py-3 px-4 text-base sm:py-2 sm:px-3 sm:text-sm",
        "outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "touch-manipulation active:bg-accent/80",
        className
      )}
      {...props}
    >
      <ArkSelect.ItemText className="flex-1">
        {children}
      </ArkSelect.ItemText>
      <ArkSelect.ItemIndicator className="ml-auto">
        <Check className="h-5 w-5 text-primary" />
      </ArkSelect.ItemIndicator>
    </ArkSelect.Item>
  )
)
SelectItem.displayName = 'SelectItem'

const SelectLabel = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <ArkSelect.ItemGroupLabel
      ref={ref}
      className={cn("px-4 py-2 text-sm font-semibold text-muted-foreground", className)}
    >
      {children}
    </ArkSelect.ItemGroupLabel>
  )
)
SelectLabel.displayName = 'SelectLabel'

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
}
