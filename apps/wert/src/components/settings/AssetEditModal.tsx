'use client'

import React, { useEffect, useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/ark/sheet'
import { Button } from '@/components/ui/ark/button'
import { Input } from '@/components/ui/ark/input'
import { Label } from '@/components/ui/ark/label'
import { AutoConfigEditor } from '@/components/settings/AutoConfigEditor'
import { SymbolSearchInput } from '@/components/settings/SymbolSearchInput'
import { getAssetById, updateAsset, AssetAccount } from '@/app/actions/assets'
import { AutoConfig, supportsAutoConfig } from '@/types/autoConfig'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  createListCollection
} from '@/components/ui/ark/select'

const CURRENCIES = [
  { value: 'CNY', label: 'CNY - 人民币' },
  { value: 'USD', label: 'USD - 美元' },
  { value: 'HKD', label: 'HKD - 港币' },
  { value: 'EUR', label: 'EUR - 欧元' },
  { value: 'GBP', label: 'GBP - 英镑' },
  { value: 'JPY', label: 'JPY - 日元' },
]

interface AssetEditModalProps {
  assetId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AssetEditModal({
  assetId,
  open,
  onOpenChange,
  onSuccess,
}: AssetEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [asset, setAsset] = useState<AssetAccount | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [symbol, setSymbol] = useState('')
  const [market, setMarket] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costBasis, setCostBasis] = useState('')
  const [autoConfig, setAutoConfig] = useState<AutoConfig | null>(null)

  useEffect(() => {
    if (open && assetId) {
      setLoading(true)
      getAssetById(assetId).then((data) => {
        if (data) {
          setAsset(data)
          setName(data.name)
          setCurrency(data.currency || 'CNY')
          setSymbol(data.symbol || '')
          setMarket(data.market || '')
          setQuantity(data.quantity || '')
          setCostBasis(data.costBasis || '')
          setAutoConfig((data.autoConfig as AutoConfig) || null)
        }
        setLoading(false)
      })
    }
  }, [open, assetId])

  const handleSave = () => {
    if (!assetId) return

    startTransition(async () => {
      await updateAsset(assetId, {
        name,
        currency,
        symbol: symbol || undefined,
        market: market || undefined,
        quantity: quantity || undefined,
        costBasis: costBasis || undefined,
        autoConfig,
      })
      onOpenChange(false)
      onSuccess?.()
    })
  }

  const isInvestmentType = asset
    ? ['STOCK', 'FUND', 'BOND', 'CRYPTO'].includes(asset.category)
    : false

  // Move collection to top level
  const currencyCollection = React.useMemo(() => createListCollection({ items: CURRENCIES }), [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>编辑资产</SheetTitle>
          <SheetDescription>修改资产信息和配置</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : asset ? (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label>名称</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="资产名称"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>货币</Label>
                  <Select value={[currency]} onValueChange={(e) => setCurrency(e.value[0])} collection={currencyCollection}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择货币" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} item={c}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">{asset.category}</span>
                  {asset.isArchived && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">已归档</span>
                  )}
                </div>
              </div>

              {/* Investment Details */}
              {isInvestmentType && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm font-medium text-slate-700 border-b pb-2">
                    投资详情
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">代码</Label>
                      <SymbolSearchInput
                        value={symbol}
                        onChange={setSymbol}
                        onSelect={(result) => {
                          if (result) {
                            // 自动填充名称（如果当前名称为空）
                            if (!name.trim()) {
                              setName(result.name)
                            }
                            // 自动设置市场
                            if (result.symbol.startsWith('sh') || result.symbol.startsWith('sz') || result.symbol.startsWith('bj') || result.symbol.endsWith('.OF')) {
                              setMarket('CN')
                            }
                          }
                        }}
                        placeholder="输入代码或名称搜索"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">市场</Label>
                      <Input
                        value={market}
                        onChange={(e) => setMarket(e.target.value)}
                        placeholder="US, HK, CN 等"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">持有数量</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="份额/股数"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs text-slate-600">成本价 (可选)</Label>
                      <Input
                        type="number"
                        value={costBasis}
                        onChange={(e) => setCostBasis(e.target.value)}
                        placeholder="买入成本"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Config */}
              {supportsAutoConfig(asset.category) && (
                <AutoConfigEditor
                  category={asset.category}
                  config={autoConfig}
                  onChange={setAutoConfig}
                />
              )}
            </div>

            <SheetFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isPending || !name.trim()}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            无法加载资产信息
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
