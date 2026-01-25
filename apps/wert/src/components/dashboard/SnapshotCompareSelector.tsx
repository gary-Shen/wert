'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSnapshotsForComparison } from '@/app/actions/snapshot'

interface SnapshotOption {
  id: string
  date: string
  netWorth: number
}

interface SnapshotCompareSelectorProps {
  currentSnapshotId: string
  selectedSnapshotId: string | null
  onSelect: (snapshotId: string) => void
  className?: string
}

export function SnapshotCompareSelector({
  currentSnapshotId,
  selectedSnapshotId,
  onSelect,
  className,
}: SnapshotCompareSelectorProps) {
  const [snapshots, setSnapshots] = useState<SnapshotOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSnapshotsForComparison().then((data) => {
      // Filter out current snapshot
      const filtered = data.filter((s) => s.id !== currentSnapshotId)
      setSnapshots(filtered)
      setLoading(false)
    })
  }, [currentSnapshotId])

  if (loading || snapshots.length === 0) {
    return null
  }

  return (
    <Select value={selectedSnapshotId || ''} onValueChange={onSelect}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="选择对比快照" />
      </SelectTrigger>
      <SelectContent>
        {snapshots.map((snap) => (
          <SelectItem key={snap.id} value={snap.id}>
            {snap.date} ({snap.netWorth.toLocaleString()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
