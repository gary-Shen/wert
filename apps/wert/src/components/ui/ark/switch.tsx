'use client'

import { Switch as ArkSwitch } from '@ark-ui/react/switch'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
}

const Switch = forwardRef<HTMLLabelElement, SwitchProps>(
  ({ checked, defaultChecked, onCheckedChange, disabled, name, value, id, className }, ref) => {
    return (
      <ArkSwitch.Root
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(e) => onCheckedChange?.(e.checked)}
        disabled={disabled}
        name={name}
        value={value}
        id={id}
        className={cn(
          "inline-flex items-center cursor-pointer",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <ArkSwitch.Control
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent",
            "bg-input transition-colors duration-200 ease-in-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "data-[state=checked]:bg-primary",
            "touch-none"
          )}
        >
          <ArkSwitch.Thumb
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0",
              "transition-transform duration-200 ease-in-out",
              "translate-x-0 data-[state=checked]:translate-x-5"
            )}
          />
        </ArkSwitch.Control>
        <ArkSwitch.HiddenInput />
      </ArkSwitch.Root>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
