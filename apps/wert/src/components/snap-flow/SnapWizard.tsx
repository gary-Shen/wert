'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { commitSnapshot, prepareSnapshotDraft, AssetSnapshotDraft } from "@/app/actions/snapshot"
import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

export function SnapWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<"LOADING" | "REVIEW" | "SAVING">("LOADING");
  const [drafts, setDrafts] = useState<AssetSnapshotDraft[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("LOADING");
      prepareSnapshotDraft().then(data => {
        setDrafts(data);
        setStep("REVIEW");
      });
    }
  }, [open]);

  const handleUpdateValue = (assetId: string, newVal: string) => {
    const val = parseFloat(newVal);
    setDrafts(ds => ds.map(d => d.assetId === assetId ? { ...d, currentValue: isNaN(val) ? 0 : val, isDirty: true } : d));
  }

  const handleQuantityChange = (assetId: string, val: string) => {
    const q = parseFloat(val);
    const qty = isNaN(q) ? 0 : q;
    setDrafts(ds => ds.map(d => {
      if (d.assetId !== assetId) return d;
      const price = d.price || 0;
      return { ...d, quantity: qty, currentValue: qty * price, isDirty: true };
    }));
  }

  const handlePriceChange = (assetId: string, val: string) => {
    const p = parseFloat(val);
    const price = isNaN(p) ? 0 : p;
    setDrafts(ds => ds.map(d => {
      if (d.assetId !== assetId) return d;
      const qty = d.quantity || 0;
      return { ...d, price: price, currentValue: qty * price, isDirty: true };
    }));
  }

  const handleSave = () => {
    setStep("SAVING");
    startTransition(async () => {
      const records = drafts.map(d => ({
        assetId: d.assetId,
        value: d.currentValue,
        quantity: d.symbol ? d.quantity : undefined
      }));
      await commitSnapshot(date, records, "User Snapshot");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>创建快照</DialogTitle>
          <DialogDescription>回顾并更新 {date} 的资产价值。</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {step === "LOADING" && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {step === "REVIEW" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Label className="shrink-0">日期</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="space-y-4">
                {drafts.map(asset => (
                  <div key={asset.assetId} className="flex items-center gap-4 border p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.type} • {asset.currency}</div>
                      {asset.calculatedValue !== asset.previousValue && !asset.symbol && (
                        <div className="text-xs text-blue-500 mt-1">
                          自动计算: {asset.calculatedValue.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {asset.symbol ? (
                      <div className="flex flex-col gap-2 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">数量</Label>
                            <Input
                              type="number"
                              value={asset.quantity || ''}
                              onChange={e => handleQuantityChange(asset.assetId, e.target.value)}
                              className={asset.isDirty ? "border-primary bg-primary/5 h-8" : "h-8"}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-[10px] text-muted-foreground">单价</Label>
                            <Input
                              type="number"
                              value={asset.price || ''}
                              onChange={e => handlePriceChange(asset.assetId, e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="text-right text-xs font-mono text-muted-foreground">
                          = {asset.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.currency}
                        </div>
                      </div>
                    ) : (
                      <div className="w-40">
                        <Input
                          type="number"
                          value={asset.currentValue}
                          onChange={e => handleUpdateValue(asset.assetId, e.target.value)}
                          className={asset.isDirty ? "border-primary bg-primary/5" : ""}
                        />
                      </div>
                    )}

                    {asset.currency !== "CNY" && (
                      <div className="absolute right-0 -bottom-5 text-xs text-muted-foreground w-40 text-right">
                        ≈ {(asset.currentValue * (asset.exchangeRate || 1)).toLocaleString()} CNY
                      </div>
                    )}
                  </div>
                ))}

                {drafts.length > 0 && (
                  <div className="flex justify-between items-center p-4 mt-6 bg-muted rounded-lg font-bold">
                    <span>预计总净值:</span>
                    <span>
                      {drafts.reduce((sum, item) => {
                        const valCny = item.currentValue * (item.exchangeRate || 1);
                        return item.type === "LIABILITY" ? sum - valCny : sum + valCny;
                      }, 0).toLocaleString()} CNY
                    </span>
                  </div>
                )}

                {drafts.length === 0 && <div className="text-center text-muted-foreground">未找到活跃资产。请前往设置添加。</div>}
              </div>
            </div>
          )}

          {step === "SAVING" && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <span className="ml-2">正在保存快照...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "REVIEW" && (
            <Button onClick={handleSave} disabled={drafts.length === 0}>确认快照</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
