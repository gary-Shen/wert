'use client'

import { Field } from '@ark-ui/react/field'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorText?: string
  invalid?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, errorText, invalid, id, ...props }, ref) => {
    if (label || helperText || errorText) {
      return (
        <Field.Root invalid={invalid} className="space-y-1.5">
          {label && (
            <Field.Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </Field.Label>
          )}
          <Field.Input
            ref={ref}
            id={id}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background transition-colors",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "data-[invalid]:border-destructive data-[invalid]:focus-visible:ring-destructive",
              // Mobile friendly
              "touch-manipulation",
              className
            )}
            {...props}
          />
          {helperText && !invalid && (
            <Field.HelperText className="text-sm text-muted-foreground">
              {helperText}
            </Field.HelperText>
          )}
          {errorText && invalid && (
            <Field.ErrorText className="text-sm text-destructive">
              {errorText}
            </Field.ErrorText>
          )}
        </Field.Root>
      )
    }

    // Simple input without field wrapper
    return (
      <input
        ref={ref}
        id={id}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "touch-manipulation",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
