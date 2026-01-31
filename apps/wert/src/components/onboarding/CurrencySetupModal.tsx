'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AVAILABLE_CURRENCIES, GeoDetectionResult } from '@/lib/geo'
import { completeSetup } from '@/app/actions/user'
import { useUserStore } from '@/stores'
import { Check, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CurrencySetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  geoResult: GeoDetectionResult
}

export function CurrencySetupModal({ open, onOpenChange, geoResult }: CurrencySetupModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(geoResult.suggestedCurrency)
  const [isPending, startTransition] = useTransition()
  const hydrate = useUserStore((state) => state.hydrate)

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await completeSetup(
        selectedCurrency,
        geoResult.region,
        geoResult.locale
      )

      if (result.success) {
        // Update local store
        hydrate({
          baseCurrency: selectedCurrency,
          region: geoResult.region,
          locale: geoResult.locale,
          setupComplete: true,
        })
        onOpenChange(false)
      }
    })
  }

  const selectedCurrencyInfo = AVAILABLE_CURRENCIES.find((c) => c.code === selectedCurrency)

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            选择基准货币
          </DialogTitle>
          <DialogDescription>
            基准货币用于统一计算您的总资产净值。
            <span className="text-amber-600 dark:text-amber-400 font-medium block mt-1">
              注意：此设置完成后不可更改
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Region Detection Info */}
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>检测到您的地区:</span>
              <span className="font-medium text-foreground">
                {geoResult.region === 'CN' ? '中国大陆' : '海外'}
              </span>
              {geoResult.confidence === 'high' && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded">
                  高置信度
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              推荐货币: {geoResult.suggestedCurrency}
            </div>
          </div>

          {/* Currency Selection Grid */}
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_CURRENCIES.map((currency) => {
              const isSelected = selectedCurrency === currency.code
              const isRecommended = currency.code === geoResult.suggestedCurrency

              return (
                <button
                  key={currency.code}
                  onClick={() => setSelectedCurrency(currency.code)}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-accent'
                  )}
                >
                  {/* Currency Symbol */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {currency.symbol}
                  </div>

                  {/* Currency Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{currency.code}</div>
                    <div className="text-xs text-muted-foreground truncate">{currency.name}</div>
                  </div>

                  {/* Selection Check */}
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary absolute top-2 right-2" />
                  )}

                  {/* Recommended Badge */}
                  {isRecommended && !isSelected && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                      推荐
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleConfirm} disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                确认使用 {selectedCurrencyInfo?.name} ({selectedCurrency})
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            所有资产价值将以 {selectedCurrency} 为单位进行汇总
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
