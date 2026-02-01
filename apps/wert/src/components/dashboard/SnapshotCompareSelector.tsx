'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  createListCollection,
} from '@/components/ui/ark/select'
import { getSnapshotsForComparison } from '@/app/actions/snapshot'
import { useMemo } from 'react'

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

  const collection = useMemo(() => createListCollection({
    items: snapshots.map(snap => ({
      value: snap.id,
      label: `${snap.date} (${snap.netWorth.toLocaleString()})`
    }))
  }), [snapshots])

  if (loading || snapshots.length === 0) {
    return null
  }

  return (
    <Select
      value={selectedSnapshotId ? [selectedSnapshotId] : []}
      onValueChange={(e) => onSelect(e.value[0])}
      collection={collection}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="选择对比快照" />
      </SelectTrigger>
      <SelectContent>
        {snapshots.map((snap) => (
          <SelectItem key={snap.id} item={{ value: snap.id, label: `${snap.date} (${snap.netWorth.toLocaleString()})` }}>
            {snap.date} ({snap.netWorth.toLocaleString()})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
