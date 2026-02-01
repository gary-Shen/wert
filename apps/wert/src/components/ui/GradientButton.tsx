'use client'

import React from 'react'
import { cn } from '@/lib/utils'

import { motion } from 'framer-motion'

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  /** Gradient angle in degrees, default is 135 */
  angle?: number
  /** Array of colors for the gradient. Defaults to [var(--gradient-from), var(--gradient-to)] */
  colors?: string[]
  /** Array of percentages/positions (e.g. 0, 50, "100%"). Defaults to even distribution. */
  stops?: (string | number)[]
  /** Additional classes for the button content wrapper */
  contentClassName?: string
}

export function GradientButton({
  children,
  className,
  angle = 135,
  colors,
  stops,
  contentClassName,
  ...props
}: GradientButtonProps) {
  // Default colors using CSS variables if not provided
  const gradientColors = colors && colors.length > 0
    ? colors
    : ['var(--gradient-from)', 'var(--gradient-to)']

  // construct standard linear-gradient string
  // if stops provided, map them to colors. if not, CSS handles distribution
  const stopsString = gradientColors.map((color, index) => {
    const stop = stops?.[index]
    const stopValue = stop !== undefined
      ? (typeof stop === 'number' ? `${stop}%` : stop)
      : ''
    return `${color} ${stopValue}`.trim()
  }).join(', ')

  const gradientStyle = {
    backgroundImage: `linear-gradient(${angle}deg, ${stopsString})`,
  } as React.CSSProperties

  const [isHoverable, setIsHoverable] = React.useState(false)

  React.useEffect(() => {
    setIsHoverable(window.matchMedia('(hover: hover)').matches)
  }, [])

  return (
    <motion.div
      className={cn(
        "p-[1px] rounded-full inline-flex cursor-pointer",
        "hover:shadow-lg",
        className
      )}
      style={gradientStyle}
      whileHover={isHoverable ? { scale: 1.5 } : {}}
      whileTap={{ scale: 0.7 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <button
        className={cn(
          "flex items-center justify-center rounded-full bg-background text-foreground transition-colors duration-200",
          "hover:bg-accent/10 focus-visible:outline-none",
          contentClassName
        )}
        type="button"
        {...props}
      >
        {children}
      </button>
    </motion.div>
  )
}
