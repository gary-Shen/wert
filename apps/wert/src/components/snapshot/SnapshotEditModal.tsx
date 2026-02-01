'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/ark/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/ark/alert-dialog'
import { Button } from '@/components/ui/ark/button'
import { Input } from '@/components/ui/ark/input'
import { Label } from '@/components/ui/ark/label'
import {
  getSnapshotDetails,
  updateSnapshot,
  deleteSnapshot,
  UpdateSnapshotData,
} from '@/app/actions/snapshot'
import { Loader2, Trash2 } from 'lucide-react'

interface SnapshotEditModalProps {
  snapshotId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface EditItem {
  id: string
  assetAccountId: string
  assetName: string
  assetCategory: string
  currency: string
  originalAmount: number
  quantity?: number
  symbol?: string
  price?: number
  isDirty: boolean
}

export function SnapshotEditModal({
  snapshotId,
  open,
  onOpenChange,
  onSuccess,
}: SnapshotEditModalProps) {
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<EditItem[]>([])
  const [originalData, setOriginalData] = useState<{
    date: string
    note: string
    totalNetWorth: number
  } | null>(null)

  useEffect(() => {
    if (open && snapshotId) {
      setLoading(true)
      getSnapshotDetails(snapshotId).then((data) => {
        if (data) {
          setDate(data.snapshot.snapDate)
          setNote(data.snapshot.note || '')
          setOriginalData({
            date: data.snapshot.snapDate,
            note: data.snapshot.note || '',
            totalNetWorth: data.snapshot.totalNetWorth,
          })

          setItems(
            data.items.map((item) => ({
              id: item.id,
              assetAccountId: item.assetAccountId,
              assetName: item.assetName,
              assetCategory: item.assetCategory,
              currency: item.currency,
              originalAmount: item.originalAmount,
              quantity: item.quantity,
              symbol: item.symbol || undefined,
              price: item.quantity ? item.originalAmount / item.quantity : undefined,
              isDirty: false,
            }))
          )
        }
        setLoading(false)
      })
    }
  }, [open, snapshotId])

  const handleValueChange = (assetAccountId: string, value: string) => {
    const numVal = parseFloat(value) || 0
    setItems((prev) =>
      prev.map((item) =>
        item.assetAccountId === assetAccountId
          ? { ...item, originalAmount: numVal, isDirty: true }
          : item
      )
    )
  }

  const handleQuantityChange = (assetAccountId: string, value: string) => {
    const qty = parseFloat(value) || 0
    setItems((prev) =>
      prev.map((item) => {
        if (item.assetAccountId !== assetAccountId) return item
        const price = item.price || 0
        return {
          ...item,
          quantity: qty,
          originalAmount: qty * price,
          isDirty: true,
        }
      })
    )
  }

  const handlePriceChange = (assetAccountId: string, value: string) => {
    const price = parseFloat(value) || 0
    setItems((prev) =>
      prev.map((item) => {
        if (item.assetAccountId !== assetAccountId) return item
        const qty = item.quantity || 0
        return {
          ...item,
          price,
          originalAmount: qty * price,
          isDirty: true,
        }
      })
    )
  }

  const handleSave = () => {
    if (!snapshotId) return

    startTransition(async () => {
      const updateData: UpdateSnapshotData = {
        snapDate: date,
        note,
        items: items.map((item) => ({
          id: item.id,
          assetAccountId: item.assetAccountId,
          originalAmount: item.originalAmount,
          quantity: item.symbol ? item.quantity : undefined,
        })),
      }

      await updateSnapshot(snapshotId, updateData)
      onOpenChange(false)
      onSuccess?.()
    })
  }

  const handleDelete = () => {
    if (!snapshotId) return

    startTransition(async () => {
      await deleteSnapshot(snapshotId)
      onOpenChange(false)
      onSuccess?.()
    })
  }

  // Calculate estimated total
  const estimatedTotal = items.reduce((sum, item) => {
    // Note: This is a simplified calculation without exchange rate conversion
    // In production, you'd need to apply exchange rates
    return item.assetCategory === 'LIABILITY'
      ? sum - item.originalAmount
      : sum + item.originalAmount
  }, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>编辑快照</SheetTitle>
          <SheetDescription>
            修改快照的日期、备注及各资产价值
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6">
              {/* Date and Note */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="可选备注"
                  />
                </div>
              </div>

              {/* Asset Items */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">资产明细</Label>
                {items.map((item) => (
                  <div
                    key={item.assetAccountId}
                    className="flex items-center gap-4 border p-3 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.assetName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.assetCategory} • {item.currency}
                      </div>
                    </div>

                    {item.symbol ? (
                      <div className="flex flex-col gap-2 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">
                              数量
                            </Label>
                            <Input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) =>
                                handleQuantityChange(item.assetAccountId, e.target.value)
                              }
                              className={
                                item.isDirty
                                  ? 'border-primary bg-primary/5 h-8'
                                  : 'h-8'
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">
                              单价
                            </Label>
                            <Input
                              type="number"
                              value={item.price || ''}
                              onChange={(e) =>
                                handlePriceChange(item.assetAccountId, e.target.value)
                              }
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="text-right text-xs font-mono text-muted-foreground">
                          ={' '}
                          {item.originalAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{' '}
                          {item.currency}
                        </div>
                      </div>
                    ) : (
                      <div className="w-40">
                        <Input
                          type="number"
                          value={item.originalAmount}
                          onChange={(e) =>
                            handleValueChange(item.assetAccountId, e.target.value)
                          }
                          className={item.isDirty ? 'border-primary bg-primary/5' : ''}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              {items.length > 0 && (
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg font-bold">
                  <span>预计总净值:</span>
                  <span>{estimatedTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            <SheetFooter className="flex-row gap-2 sm:gap-2 px-6 pb-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除快照？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销。删除后，该快照的所有数据将被永久清除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex-1" />

              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存修改'
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
