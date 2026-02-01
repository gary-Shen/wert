'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/stores/userStore'

export function DataSynchronizer() {
  const fetchUserSettings = useUserStore((state) => state.fetchUserSettings)

  useEffect(() => {
    // Silent background fetch on mount
    fetchUserSettings()
  }, [fetchUserSettings])

  return null
}
