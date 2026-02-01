'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { PopoverContent } from '@/components/ui/ark/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/ark/tabs'
import { Button } from '@/components/ui/ark/button'
import { getAssets } from '@/app/actions/assets'
import { getUserSettings, updateUserSettings, UserSettings } from '@/app/actions/user'
import { AssetAccount } from '@/app/actions/assets'
import { Loader2, User, Wallet, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { ScrollView } from '@/components/ui/ark/scroll-view'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  createListCollection
} from '@/components/ui/ark/select'
import { AssetManagementCompact } from './AssetManagementCompact'

const CURRENCIES = [
  { value: 'CNY', label: '人民币 (CNY)' },
  { value: 'USD', label: '美元 (USD)' },
  { value: 'HKD', label: '港币 (HKD)' },
  { value: 'EUR', label: '欧元 (EUR)' },
  { value: 'GBP', label: '英镑 (GBP)' },
  { value: 'JPY', label: '日元 (JPY)' },
]

interface SettingsPopoverProps {
  onClose: () => void
}

export function SettingsPopover({ onClose }: SettingsPopoverProps) {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<AssetAccount[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const router = useRouter()
  const { theme, setTheme } = useTheme()

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
    refreshData()
  }, [refreshData])

  const refreshAssets = useCallback(() => {
    getAssets().then(setAssets)
  }, [])

  const handleCurrencyChange = async (currency: string) => {
    if (!userSettings) return
    await updateUserSettings({ baseCurrency: currency })
    setUserSettings(prev => prev ? { ...prev, baseCurrency: currency } : null)
    router.refresh()
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
    router.push('/login')
  }

  const currencyCollection = React.useMemo(() => createListCollection({ items: CURRENCIES }), [])

  return (
    <PopoverContent
      className="w-96 p-0 rounded-xl shadow-2xl border-border/50 max-h-[calc(100vh-32px)] overflow-hidden"
    >
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(e) => setActiveTab(e.value)} className="flex flex-col h-full">
          <div className="px-3 pt-3 pb-2 border-b">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="profile" className="flex items-center gap-1.5 text-sm">
                <User className="w-3.5 h-3.5" />
                账户
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-1.5 text-sm">
                <Wallet className="w-3.5 h-3.5" />
                资产
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollView className="flex-1 max-h-[400px]">
            <TabsContent value="profile" className="m-0 p-4 space-y-4">
              {userSettings && (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    {userSettings.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userSettings.image}
                        alt={userSettings.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{userSettings.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{userSettings.email}</div>
                    </div>
                  </div>

                  {/* Base Currency */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">基准货币</label>
                    <Select
                      value={[userSettings.baseCurrency || 'CNY']}
                      onValueChange={(e) => handleCurrencyChange(e.value[0])}
                      collection={currencyCollection}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.value} item={c}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">主题</label>
                    <div className="flex gap-2">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="w-4 h-4 mr-1.5" />
                        浅色
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="w-4 h-4 mr-1.5" />
                        深色
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTheme('system')}
                      >
                        <Monitor className="w-4 h-4 mr-1.5" />
                        系统
                      </Button>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="assets" className="m-0 p-4">
              <AssetManagementCompact
                initialAssets={assets}
                onAssetsChange={refreshAssets}
              />
            </TabsContent>
          </ScrollView>
        </Tabs>
      )}
    </PopoverContent>
  )
}
