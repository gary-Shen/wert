'use client'

import { useEffect, useRef } from 'react'
import { useUserStore, UserSettings } from '@/stores'

interface StoreProviderProps {
  children: React.ReactNode
  userSettings?: Partial<UserSettings>
}

export function StoreProvider({ children, userSettings }: StoreProviderProps) {
  const hydrated = useRef(false)
  const hydrate = useUserStore((state) => state.hydrate)

  useEffect(() => {
    if (!hydrated.current && userSettings) {
      hydrate(userSettings)
      hydrated.current = true
    }
  }, [userSettings, hydrate])

  return <>{children}</>
}
