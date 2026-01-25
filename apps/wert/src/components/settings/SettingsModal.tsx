'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetManagement } from '@/components/settings/AssetManagement'
import { UserProfileTab } from '@/components/settings/UserProfileTab'
import { getAssets } from '@/app/actions/assets'
import { getUserSettings, UserSettings } from '@/app/actions/user'
import { AssetAccount } from '@/app/actions/assets'
import { Loader2, User, Wallet } from 'lucide-react'

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<AssetAccount[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [activeTab, setActiveTab] = useState('profile')

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [assetsData, userData] = await Promise.all([
        getAssets(),
        getUserSettings()
      ])
      setAssets(assetsData)
      setUserSettings(userData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      refreshData()
    }
  }, [open, refreshData])

  const refreshAssets = useCallback(() => {
    getAssets().then(setAssets)
  }, [])

  const refreshUser = useCallback(() => {
    getUserSettings().then(setUserSettings)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">设置</DialogTitle>
          <DialogDescription>
            管理您的账户信息和资产配置
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  用户信息
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  资产管理
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <TabsContent value="profile" className="mt-4">
                {userSettings && (
                  <UserProfileTab
                    user={{
                      name: userSettings.name,
                      email: userSettings.email,
                      image: userSettings.image,
                      baseCurrency: userSettings.baseCurrency,
                    }}
                    onUserUpdate={refreshUser}
                  />
                )}
              </TabsContent>

              <TabsContent value="assets" className="mt-4">
                <AssetManagement initialAssets={assets} onAssetsChange={refreshAssets} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
