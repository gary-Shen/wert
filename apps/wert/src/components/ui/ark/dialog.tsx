'use client'

import * as React from 'react'
import { Dialog as ArkDialog, Portal } from '@ark-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

// Types
export interface DialogProps extends ArkDialog.RootProps {
  children: React.ReactNode
}

// Subcomponents
const DialogRoot = ArkDialog.Root
const DialogTrigger = ArkDialog.Trigger
const DialogClose = ArkDialog.CloseTrigger

const DialogContent = React.forwardRef<
  HTMLDivElement,
  ArkDialog.ContentProps & { containerClassName?: string }
>(({ children, className, containerClassName, ...props }, ref) => {
  return (
    <Portal>
      <ArkDialog.Backdrop asChild>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
      </ArkDialog.Backdrop>
      <ArkDialog.Positioner className={cn("fixed inset-0 z-50 flex items-center justify-center", containerClassName)}>
        <ArkDialog.Content asChild {...props} ref={ref}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl text-card-foreground",
              className
            )}
          >
            {children}
            <DialogClose asChild>
              <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground cursor-pointer">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </div>
            </DialogClose>
          </motion.div>
        </ArkDialog.Content>
      </ArkDialog.Positioner>
    </Portal>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof ArkDialog.Title>,
  ArkDialog.TitleProps
>(({ className, ...props }, ref) => (
  <ArkDialog.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof ArkDialog.Description>,
  ArkDialog.DescriptionProps
>(({ className, ...props }, ref) => (
  <ArkDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"


export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose
}
