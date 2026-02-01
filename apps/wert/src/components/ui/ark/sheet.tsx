'use client'

import * as React from 'react'
import { Dialog as ArkDialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface SheetContentProps {
  children: React.ReactNode
  className?: string
  side?: 'bottom' | 'right'
}

interface SheetHeaderProps {
  children: React.ReactNode
  className?: string
}

interface SheetTitleProps {
  children: React.ReactNode
  className?: string
}

interface SheetDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface SheetFooterProps {
  children: React.ReactNode
  className?: string
}

interface SheetCloseProps {
  children?: React.ReactNode
  className?: string
  asChild?: boolean
}

const SheetContext = React.createContext<{
  onClose: () => void
}>({ onClose: () => { } })

const Sheet = ({ open, onOpenChange, children, className }: SheetProps) => {
  return (
    <SheetContext.Provider value={{ onClose: () => onOpenChange(false) }}>
      <ArkDialog.Root
        open={open}
        onOpenChange={(e) => onOpenChange(e.open)}
        modal
      >
        {children}
      </ArkDialog.Root>
    </SheetContext.Provider>
  )
}

const SheetTrigger = ArkDialog.Trigger

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ children, className, side = 'bottom' }, ref) => {
    const { onClose } = React.useContext(SheetContext)
    const dragControls = useDragControls()

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Close if dragged down more than 100px or with enough velocity
      if (side === 'bottom' && (info.offset.y > 100 || info.velocity.y > 500)) {
        onClose()
      }
      // Close if dragged right more than 100px
      if (side === 'right' && (info.offset.x > 100 || info.velocity.x > 500)) {
        onClose()
      }
    }

    const variants = {
      bottom: {
        hidden: { y: '100%' },
        visible: { y: 0 },
        exit: { y: '100%' }
      },
      right: {
        hidden: { x: '100%' },
        visible: { x: 0 },
        exit: { x: '100%' }
      }
    }

    return (
      <Portal>
        <AnimatePresence>
          <ArkDialog.Backdrop asChild key="backdrop">
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </ArkDialog.Backdrop>
          <ArkDialog.Positioner key="positioner" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <ArkDialog.Content asChild>
              <motion.div
                ref={ref}
                drag={side === 'bottom' ? 'y' : 'x'}
                dragControls={dragControls}
                dragConstraints={{ top: 0, left: 0 }}
                dragElastic={{ top: 0, bottom: 0.5, left: 0, right: 0.5 }}
                onDragEnd={handleDragEnd}
                initial={variants[side].hidden}
                animate={variants[side].visible}
                exit={variants[side].exit}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  'relative bg-background',
                  // Bottom sheet styles
                  side === 'bottom' && [
                    'w-full max-h-[90vh] rounded-t-3xl',
                    'sm:max-w-lg sm:rounded-2xl sm:max-h-[85vh]'
                  ],
                  // Right sheet styles (for larger screens)
                  side === 'right' && [
                    'h-full w-[85vw] max-w-md',
                    'sm:w-[400px]'
                  ],
                  className
                )}
              >
                {/* Drag handle for bottom sheet */}
                {side === 'bottom' && (
                  <div
                    className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={(e) => dragControls.start(e)}
                  >
                    <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
                  </div>
                )}

                {children}

                {/* Close button */}
                <ArkDialog.CloseTrigger
                  className={cn(
                    "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background",
                    "transition-opacity hover:opacity-100",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:pointer-events-none"
                  )}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">关闭</span>
                </ArkDialog.CloseTrigger>
              </motion.div>
            </ArkDialog.Content>
          </ArkDialog.Positioner>
        </AnimatePresence>
      </Portal>
    )
  }
)
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ children, className }: SheetHeaderProps) => (
  <div className={cn('flex flex-col space-y-1.5 px-6 pb-4', className)}>
    {children}
  </div>
)
SheetHeader.displayName = 'SheetHeader'

const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ children, className }, ref) => (
    <ArkDialog.Title asChild>
      <h2
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      >
        {children}
      </h2>
    </ArkDialog.Title>
  )
)
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<HTMLParagraphElement, SheetDescriptionProps>(
  ({ children, className }, ref) => (
    <ArkDialog.Description asChild>
      <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
      >
        {children}
      </p>
    </ArkDialog.Description>
  )
)
SheetDescription.displayName = 'SheetDescription'

const SheetFooter = ({ children, className }: SheetFooterProps) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 pb-6',
      className
    )}
  >
    {children}
  </div>
)
SheetFooter.displayName = 'SheetFooter'

const SheetClose = ({ children, className, asChild }: SheetCloseProps) => (
  <ArkDialog.CloseTrigger asChild={asChild} className={className}>
    {children}
  </ArkDialog.CloseTrigger>
)
SheetClose.displayName = 'SheetClose'

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
}
