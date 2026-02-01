'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Settings, ChevronDown } from 'lucide-react'

interface PullToSettingsProps {
  children: React.ReactNode
  onTrigger: () => void
  threshold?: number
}

export function PullToSettings({
  children,
  onTrigger,
  threshold = 100
}: PullToSettingsProps) {
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const y = useMotionValue(0)
  const startY = useRef(0)
  const isPulling = useRef(false)

  // Progress from 0 to 1 based on pull distance
  const progress = useTransform(y, [0, threshold], [0, 1])
  const opacity = useTransform(y, [0, threshold * 0.5, threshold], [0, 0.5, 1])
  const iconRotate = useTransform(y, [0, threshold], [0, 180])
  const scale = useTransform(y, [0, threshold], [0.8, 1])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const content = contentRef.current
    if (!content || !isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      // If window is scrolled down, don't allow pull
      if (window.scrollY > 0) {
        startY.current = -1
        return
      }

      // Check inner scroll container
      const target = e.target as HTMLElement
      const scrollContainer = target.closest('[data-scroll-container]')

      if (scrollContainer && scrollContainer.scrollTop > 0) {
        startY.current = -1
        return
      }

      startY.current = e.touches[0].clientY
      isPulling.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current < 0) return

      const currentY = e.touches[0].clientY
      const deltaY = currentY - startY.current

      // Only handle downward pull when at top
      if (deltaY > 0) {
        // If we haven't started pulling yet, check if this move is intended as a pull
        if (!isPulling.current) {
          isPulling.current = true
        }

        // Prevent default only if we are actively pulling layout
        if (isPulling.current && e.cancelable) {
          e.preventDefault() // Stop native scroll/refresh

          // Apply resistance
          const newY = Math.pow(deltaY, 0.8)
          y.set(Math.min(newY, threshold * 2))
        }
      } else {
        // Upward scroll - let it happen naturally
        isPulling.current = false
      }
    }

    const handleTouchEnd = () => {
      if (isPulling.current) {
        if (y.get() >= threshold) {
          onTrigger()
        }
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
        isPulling.current = false
      }
      startY.current = -1
    }

    // Add passive: false to allow preventDefault
    content.addEventListener('touchstart', handleTouchStart, { passive: true })
    content.addEventListener('touchmove', handleTouchMove, { passive: false })
    content.addEventListener('touchend', handleTouchEnd)
    content.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      content.removeEventListener('touchstart', handleTouchStart)
      content.removeEventListener('touchmove', handleTouchMove)
      content.removeEventListener('touchend', handleTouchEnd)
      content.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isMobile, threshold, onTrigger, y])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center justify-center pointer-events-none"
        style={{
          height: y,
          opacity
        }}
      >
        <motion.div
          className="flex flex-col items-center gap-1 text-muted-foreground"
          style={{ scale }}
        >
          <motion.div style={{ rotate: iconRotate }}>
            <ChevronDown className="w-6 h-6" />
          </motion.div>
          <div className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4" />
            <motion.span style={{ opacity: progress }}>
              {y.get() >= threshold ? '松开打开设置' : '下拉打开设置'}
            </motion.span>
          </div>
        </motion.div>
      </motion.div>

      {/* Main content wrapper */}
      <motion.div
        ref={contentRef}
        className="h-full w-full"
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  )
}
