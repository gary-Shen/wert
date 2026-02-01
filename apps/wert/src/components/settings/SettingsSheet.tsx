'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/ark/tabs'
import { Button } from '@/components/ui/ark/button'
import { updateUserSettings } from '@/app/actions/user'
import { Loader2, User, Wallet, LogOut, Sun, Moon, Monitor, X, ChevronDown } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/stores/userStore'
import { ScrollView } from '@/components/ui/ark/scroll-view'
import { GradientButton } from '@/components/ui/GradientButton'

import { AssetManagementCompact } from './AssetManagementCompact'


const CURRENCIES = [
  { value: 'CNY', label: '人民币 (CNY)' },
  { value: 'USD', label: '美元 (USD)' },
  { value: 'HKD', label: '港币 (HKD)' },
  { value: 'EUR', label: '欧元 (EUR)' },
  { value: 'GBP', label: '英镑 (GBP)' },
  { value: 'JPY', label: '日元 (JPY)' },
]

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const {
    name, email, image, baseCurrency, locale, region,
    assets, fetchAssets, isUserLoading
  } = useUserStore()

  const [activeTab, setActiveTab] = useState('profile')
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (open) {
      // Refresh assets when opening to ensure freshness without blocking UI
      fetchAssets()
    }
  }, [open, fetchAssets])

  const handleCurrencyChange = async (currency: string) => {
    await updateUserSettings({ baseCurrency: currency })
    // We should ideally update the store locally or re-fetch
    useUserStore.getState().setBaseCurrency(currency)
    router.refresh()
  }

  const handleSignOut = async () => {
    await signOut()
    useUserStore.getState().reset()
    onClose()
    router.push('/login')
  }

  // Construct userSettings object for compatibility with existing render logic if needed, 
  // or just use destructured vars directly.
  const hasUserInfo = !!(name || email)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 200) {
                onClose()
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 h-[90vh] bg-background rounded-t-3xl shadow-2xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <h2 className="text-xl font-semibold">设置</h2>
              <GradientButton
                onClick={onClose}
                contentClassName="w-9 h-9 bg-muted"
                colors={['#fff', 'var(--muted)', '#fff']}
              >
                <X className="w-5 h-5" />
              </GradientButton>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden h-[calc(90vh-100px)]">
              <Tabs value={activeTab} onValueChange={(e) => setActiveTab(e.value)} className="flex flex-col h-full">
                <div className="px-6 pb-4">
                  <TabsList className="w-full grid grid-cols-2 h-11">
                    <TabsTrigger value="profile" className="flex items-center gap-2 text-base">
                      <User className="w-4 h-4" />
                      账户
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="flex items-center gap-2 text-base">
                      <Wallet className="w-4 h-4" />
                      资产
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollView className="flex-1">
                  <TabsContent value="profile" className="m-0 p-6 space-y-6">
                    {isUserLoading && !hasUserInfo ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image}
                              alt={name || 'User'}
                              className="w-16 h-16 rounded-full"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-lg">{name || 'User'}</div>
                            <div className="text-sm text-muted-foreground">{email}</div>
                          </div>
                        </div>

                        {/* Base Currency */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">基准货币</label>
                          <div className="relative">
                            <select
                              className="flex h-12 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={baseCurrency}
                              onChange={(e) => handleCurrencyChange(e.target.value)}
                            >
                              {CURRENCIES.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
                          </div>
                        </div>

                        {/* Theme */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">主题</label>
                          <div className="flex gap-2">
                            {[
                              { value: 'light', icon: Sun, label: '浅色' },
                              { value: 'dark', icon: Moon, label: '深色' },
                              { value: 'system', icon: Monitor, label: '系统' },
                            ].map(({ value, icon: Icon, label }) => (
                              <Button
                                key={value}
                                variant={theme === value ? 'default' : 'outline'}
                                className="flex-1 h-12 gap-2"
                                onClick={() => setTheme(value)}
                              >
                                <Icon className="w-4 h-4" />
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Sign Out */}
                        <Button
                          variant="outline"
                          className="w-full h-12 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          onClick={handleSignOut}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          退出登录
                        </Button>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="assets" className="m-0">
                    <AssetManagementCompact
                      initialAssets={assets}
                      onAssetsChange={fetchAssets}
                    />
                  </TabsContent>
                </ScrollView>
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
