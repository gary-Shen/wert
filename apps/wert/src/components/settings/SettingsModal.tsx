'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AssetManagement } from '@/components/settings/AssetManagement'
import { getAssets } from '@/app/actions/assets'
import { AssetAccount } from '@/app/actions/assets'
import { Loader2 } from 'lucide-react'

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<AssetAccount[]>([])

  const refreshAssets = useCallback(() => {
    setLoading(true)
    getAssets()
      .then(setAssets)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refreshAssets()
  }, [refreshAssets])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">设置</DialogTitle>
          <DialogDescription>
            管理您的资产和配置
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <AssetManagement initialAssets={assets} onAssetsChange={refreshAssets} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
